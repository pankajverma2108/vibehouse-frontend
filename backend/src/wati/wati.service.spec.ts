import { WatiService } from './wati.service';

/**
 * Wiring test for the newline fix. The unit tests in
 * common/utils/whatsapp-param.util.spec.ts prove the transform; these prove that
 * what actually leaves the process over HTTP obeys WhatsApp's parameter rule,
 * and that free-text session messages are deliberately left alone.
 */
describe('WatiService — template parameter safety', () => {
  let svc: WatiService;
  let fetchMock: jest.Mock;
  const OLD_ENV = process.env;

  const lastBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);
  const lastParams = (): { name: string; value: string }[] => lastBody().parameters;

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
    svc = new WatiService();
    jest.spyOn(svc['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('sends the escalation template with a flattened text param', async () => {
    // The exact shape that killed #477/#478: a multi-line guest request carried
    // into escalation_template_v4's `text` param.
    const res = await svc.sendTemplateMessage('TDS', '919986997827', 'escalation_template_v4', [
      { name: 'severity', value: 'Escalation' },
      { name: 'system', value: 'TDS' },
      { name: 'text', value: 'Guest has ordered food from Swiggy\nto Room 505' },
      { name: 'roomNo', value: '505' },
      { name: 'userName', value: 'Anita' },
      { name: 'phone', value: '919986997827' },
      { name: 'level', value: 'L2' },
    ]);

    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const params = lastParams();
    expect(params.find((p) => p.name === 'text')!.value).toBe(
      'Guest has ordered food from Swiggy. to Room 505',
    );
    // Untouched params stay byte-identical.
    expect(params.find((p) => p.name === 'roomNo')!.value).toBe('505');
    expect(params.map((p) => p.name)).toEqual([
      'severity',
      'system',
      'text',
      'roomNo',
      'userName',
      'phone',
      'level',
    ]);
  });

  it.each([
    ['a towel request across three lines', 'Can you send me a towel\nat 404 \nand 405 \n'],
    ['CRLF from a desktop paste', 'AC not cooling\r\nRoom 210\r\nsince morning'],
    ['tabs', 'Room\t404\tneeds\tcleaning'],
    ['a long space run', 'towel' + ' '.repeat(20) + 'please'],
    ['a 4000-character rant', 'the geyser is broken. '.repeat(200)],
    ['blank lines only', '\n\n\n'],
  ])('never puts a rejectable value on the wire (%s)', async (_label, value) => {
    await svc.sendTemplateMessage('TDS', '919986997827', 'service_staff_assign_v1', [
      { name: 'name', value: 'Praveer' },
      { name: 'request', value },
      { name: 'room_no', value: '404' },
    ]);
    for (const p of lastParams()) {
      expect(p.value).not.toMatch(/[\r\n\t]/);
      expect(p.value).not.toMatch(/ {5,}/);
      expect(p.value.length).toBeLessThanOrEqual(1000);
    }
    // And the raw JSON body carries no literal newline inside a parameter value.
    expect(fetchMock.mock.calls[0][1].body).not.toMatch(/\\n/);
  });

  it('leaves an already-clean parameter set byte-identical', async () => {
    const params = [
      { name: 'name', value: 'Ravi' },
      { name: 'request', value: 'Extra pillow' },
      { name: 'room_no', value: '101 A' },
      { name: 'turn_around_time', value: '30 min' },
      { name: '1', value: '5f3c1d2e-9a44-4b1e-9d55-77a1c2b3d4e5' },
    ];
    await svc.sendTemplateMessage('TDS', '919986997827', 'service_staff_assign_v1', params);
    expect(lastParams()).toEqual(params);
  });

  it('preserves template_name and broadcast_name', async () => {
    await svc.sendTemplateMessage(
      'TDS',
      '919986997827',
      'guest_request_notify',
      [{ name: 'request', value: 'towel\n404' }],
      'vibehouse_ticketing',
    );
    const body = lastBody();
    expect(body.template_name).toBe('guest_request_notify');
    expect(body.broadcast_name).toBe('vibehouse_ticketing');
  });

  it('does NOT sanitise free-text session messages', async () => {
    // GUEST_RECEPTION_ACK and friends use \n on purpose; session messages have no
    // parameter restriction, so flattening them would be a visible regression.
    const multiline = 'Line one\nLine two\nLine three';
    await svc.sendSessionMessage('TDS', '919986997827', multiline);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(url.split('messageText=')[1])).toBe(multiline);
  });

  it('still skips cleanly when the brand has no creds', async () => {
    const res = await svc.sendTemplateMessage('BUTEAK', '919986997827', 'x', [
      { name: 'text', value: 'a\nb' },
    ]);
    expect(res).toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
