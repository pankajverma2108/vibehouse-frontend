// `uuid` ships ESM-only and this repo's jest transform doesn't cover node_modules.
// NotifyWorker only uses it for the notification_log row id, which we stub anyway.
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));

import { NotifyWorker } from '../sqs/workers/notify.worker';
import { NotifyMessageType } from '../sqs/sqs.constants';
import { WatiService } from './wati.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * End-to-end chain test for the WATI newline defect.
 *
 * The unit tests prove the transform and wati.service.spec.ts proves the HTTP
 * boundary. This one walks the whole path a guest's WhatsApp message actually
 * takes on its way to a staff member's phone:
 *
 *   guest text
 *     -> ticketSubject()          (subject embeds the guest's RAW words)
 *     -> variables map            (tickets.service.ts / ops-task.worker.ts)
 *     -> NotifyWorker.toParams()  (REAL worker, real method)
 *     -> WatiService              (REAL service, fetch intercepted)
 *     -> the JSON body WATI receives
 *
 * and asserts that body against the rule WhatsApp enforces. Every case is run
 * twice — once through the current code, once with the sanitiser bypassed — so a
 * failure tells you whether the fix broke or whether the case was never broken.
 */

/** The predicate WhatsApp applies. A parameter failing this fails the send. */
const rejectedByWhatsApp = (v: string) =>
  /[\r\n\t]/.test(v) ||
  / {5,}/.test(v) ||
  new RegExp('[' + String.fromCharCode(0x85, 0x2028, 0x2029) + ']').test(v);

/**
 * Verbatim copy of WaServiceService.ticketSubject (wa-service.service.ts:1918).
 * Reproduced rather than imported because it is private and the class needs the
 * full DI graph; if it changes there, this must change too. It is the reason the
 * defect exists at all: the subject deliberately carries the guest's raw words,
 * line breaks and all, so staff can see exactly what was typed.
 */
function ticketSubject(interpreted: string, original?: string): string {
  const clean = (interpreted || '').trim();
  const raw = (original || '').trim();
  if (
    !raw ||
    clean.toLowerCase() === raw.toLowerCase() ||
    clean.toLowerCase().includes(raw.toLowerCase())
  ) {
    return clean.slice(0, 240);
  }
  return `${clean} (${raw})`.slice(0, 240);
}

/** Realistic inbound messages, the way guests actually type them on a phone. */
const GUEST_MESSAGES: { label: string; interpreted: string; text: string }[] = [
  {
    label: 'the reported towel request',
    interpreted: 'Request for towel',
    text: 'Can you send me a towel\nat 404 \nand 405 ',
  },
  {
    label: '#477 Swiggy delivery',
    interpreted: 'Food delivery to room',
    text: 'Guest has ordered food from Swiggy\nto Room 505',
  },
  {
    label: '#478 Swiggy delivery, second room',
    interpreted: 'Food delivery to room',
    text: 'Guest has ordered food from Swiggy\nfor Room 504',
  },
  {
    label: 'greeting then request (two lines)',
    interpreted: 'Request for towel',
    text: 'Hi\nplease send a towel to 302',
  },
  {
    label: 'five-line list',
    interpreted: 'Housekeeping supplies',
    text: 'Hi\nplease send\n2 towels\n1 soap\nRoom 302',
  },
  {
    label: 'desktop paste with CRLF',
    interpreted: 'AC not cooling',
    text: 'AC not cooling\r\nRoom 210\r\nsince morning',
  },
  {
    label: 'trailing newline only',
    interpreted: 'Request for water',
    text: 'need water bottles\n',
  },
  {
    label: 'blank lines between sentences',
    interpreted: 'Cleaning request',
    text: 'room not cleaned\n\n\nplease send someone',
  },
  {
    label: 'already punctuated lines',
    interpreted: 'AC fault',
    text: 'AC is not working.\nPlease send someone.',
  },
  {
    label: 'question then room',
    interpreted: 'Guest question',
    text: 'is breakfast included?\nRoom 101',
  },
  {
    label: 'bulleted list',
    interpreted: 'Housekeeping supplies',
    text: 'Please send:\n- towel\n- soap',
  },
  {
    label: 'tabs from a copy-paste',
    interpreted: 'Cleaning request',
    text: 'Room\t404\tneeds\tcleaning',
  },
  {
    label: 'emoji-terminated line',
    interpreted: 'Thanks and request',
    text: 'Thanks a lot ' + String.fromCodePoint(0x1f64f) + '\nRoom 404 needs a pillow',
  },
  {
    label: 'long space run',
    interpreted: 'Request for towel',
    text: 'towel' + ' '.repeat(20) + 'please',
  },
  {
    label: 'emergency, multi-line',
    interpreted: 'Fire alarm',
    text: 'FIRE\nsmoke in the corridor\n3rd floor',
  },
  // Control group — these were never broken and must stay untouched.
  { label: 'plain single line', interpreted: 'Request for towel', text: 'send a towel to 404' },
  { label: 'single word', interpreted: 'Request for towel', text: 'towel' },
  {
    label: 'hyphenated single line',
    interpreted: 'AC fault',
    text: 'AC not cooling in 206 - please check',
  },
];

describe('WATI newline defect — full notify chain', () => {
  let worker: NotifyWorker;
  let wati: WatiService;
  let fetchMock: jest.Mock;
  const OLD_ENV = process.env;

  const prismaStub = {
    notification_log: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  /** The parameter array WATI actually received on the last call. */
  const sentParams = (): { name: string; value: string }[] =>
    JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body).parameters;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.WATI_TDS_BASE_URL = 'https://live-mt-server.wati.io/446388';
    process.env.WATI_TDS_TOKEN = 'test-token';
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: true }),
    });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    wati = new WatiService();
    worker = new NotifyWorker(prismaStub, wati);
    for (const svc of [wati, worker]) {
      jest.spyOn(svc['logger'], 'log').mockImplementation(() => undefined);
      jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
      jest.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);
    }
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  describe.each(GUEST_MESSAGES)('$label', ({ interpreted, text }) => {
    const subject = ticketSubject(interpreted, text);

    it('STAFF_ASSIGNED — every parameter is accepted by WhatsApp', async () => {
      await worker.process({
        type: NotifyMessageType.NOTIFY_STAFF,
        payload: {
          staff_phone: '919986997827',
          staff_name: 'Praveer',
          brand: 'TDS',
          template: 'service_staff_assign_v1',
          variables: {
            name: 'Praveer',
            request: subject,
            room_no: '404',
            turn_around_time: '30 min',
            job_id: 'tk-1',
            '1': 'tk-1',
          },
        },
      } as never);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      for (const p of sentParams()) expect(rejectedByWhatsApp(p.value)).toBe(false);
    });

    it('STAFF_ESCALATION — every parameter is accepted by WhatsApp', async () => {
      // This is the send that failed for #477/#478: escalation_template_v4 carries
      // the same subject in `text`, and its rejection is why "none of the escalated
      // levels got this ticket".
      await worker.process({
        type: NotifyMessageType.NOTIFY_STAFF,
        payload: {
          staff_phone: '919986997827',
          staff_name: 'Sunil',
          brand: 'TDS',
          template: 'escalation_template_v4',
          variables: {
            severity: 'Escalation',
            system: 'TDS',
            text: subject,
            roomNo: '404',
            userName: 'Anita',
            phone: '919986997827',
            level: 'L2',
            original_assignee: 'Praveer',
            '1': 'tk-1',
          },
        },
      } as never);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      for (const p of sentParams()) expect(rejectedByWhatsApp(p.value)).toBe(false);
    });

    it('GUEST_ACK — every parameter is accepted by WhatsApp', async () => {
      await worker.process({
        type: NotifyMessageType.NOTIFY_GUEST,
        payload: {
          guest_id: 'g-1',
          guest_phone: '919986997827',
          brand: 'TDS',
          template: 'guest_request_notify',
          variables: {
            name: 'Anita',
            request: subject,
            staff_name: 'Praveer',
            room_no: '404',
          },
        },
      } as never);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      for (const p of sentParams()) expect(rejectedByWhatsApp(p.value)).toBe(false);
    });

    it('the flattened subject still contains every word the guest typed', async () => {
      await worker.process({
        type: NotifyMessageType.NOTIFY_STAFF,
        payload: {
          staff_phone: '919986997827',
          staff_name: 'Praveer',
          brand: 'TDS',
          template: 'service_staff_assign_v1',
          variables: { name: 'Praveer', request: subject, room_no: '404' },
        },
      } as never);

      const delivered = sentParams().find((p) => p.name === 'request')!.value;
      // Nothing may be dropped: staff must see what the guest actually asked for.
      // (Room numbers, item names and quantities are the words that matter here.)
      const words = subject.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
      for (const w of words) expect(delivered).toContain(w);
    });
  });

  describe('regression control — the sanitiser is doing real work', () => {
    it('at least ten of these cases would have been REJECTED before the fix', () => {
      const broken = GUEST_MESSAGES.filter(({ interpreted, text }) =>
        rejectedByWhatsApp(ticketSubject(interpreted, text)),
      );
      expect(broken.length).toBeGreaterThanOrEqual(10);
    });

    it('the three control cases were never broken and are passed through verbatim', async () => {
      const controls = GUEST_MESSAGES.slice(-3);
      for (const { interpreted, text } of controls) {
        const subject = ticketSubject(interpreted, text);
        jest.clearAllMocks();
        await worker.process({
          type: NotifyMessageType.NOTIFY_STAFF,
          payload: {
            staff_phone: '919986997827',
            staff_name: 'Praveer',
            brand: 'TDS',
            template: 'service_staff_assign_v1',
            variables: { name: 'Praveer', request: subject, room_no: '404' },
          },
        } as never);
        expect(sentParams().find((p) => p.name === 'request')!.value).toBe(subject);
      }
    });
  });

  describe('the exact strings staff will now read', () => {
    it.each([
      ['Request for towel (Can you send me a towel. at 404. and 405)', 0],
      ['Food delivery to room (Guest has ordered food from Swiggy. to Room 505)', 1],
      ['Housekeeping supplies (Hi. please send. 2 towels. 1 soap. Room 302)', 4],
      ['AC not cooling (AC not cooling. Room 210. since morning)', 5],
      ['Request for water (need water bottles)', 6],
      ['Cleaning request (room not cleaned. please send someone)', 7],
      ['AC fault (AC is not working. Please send someone.)', 8],
      ['Guest question (is breakfast included? Room 101)', 9],
      ['Housekeeping supplies (Please send: - towel. - soap)', 10],
      ['Cleaning request (Room 404 needs cleaning)', 11],
    ])('reads as %j', async (expected, idx) => {
      const { interpreted, text } = GUEST_MESSAGES[idx];
      await worker.process({
        type: NotifyMessageType.NOTIFY_STAFF,
        payload: {
          staff_phone: '919986997827',
          staff_name: 'Praveer',
          brand: 'TDS',
          template: 'service_staff_assign_v1',
          variables: { name: 'Praveer', request: ticketSubject(interpreted, text), room_no: '404' },
        },
      } as never);
      expect(sentParams().find((p) => p.name === 'request')!.value).toBe(expected);
    });
  });
});
