import {
  flattenForWhatsAppParam as flat,
  flattenTemplateParams,
} from './whatsapp-param.util';

const NEL = String.fromCharCode(0x85);
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const NBSP = String.fromCharCode(0xa0);
const ZWSP = String.fromCharCode(0x200b);
const IDEO_SPACE = String.fromCharCode(0x3000);
const ELLIPSIS = String.fromCharCode(0x2026);

/**
 * The rule WhatsApp actually enforces: no newline, no tab, no run of more than
 * four spaces. Every assertion below ultimately reduces to this predicate, so
 * it is worth stating once.
 */
const isAcceptable = (v: string) => !/[\r\n\t]/.test(v) && !/ {5,}/.test(v) && !new RegExp('[' + NEL + LS + PS + ']').test(v);

describe('flattenForWhatsAppParam', () => {
  describe('the reported case', () => {
    it("turns the reporter's example into the reporter's expected output", () => {
      expect(flat('Can you send me a towel\nat 404 \nand 405 \n')).toBe(
        'Can you send me a towel. at 404. and 405',
      );
    });

    it('rescues the #477/#478 Swiggy escalation text', () => {
      const subject = 'Guest has ordered food from Swiggy\nto Room 505';
      expect(flat(subject)).toBe('Guest has ordered food from Swiggy. to Room 505');
      expect(isAcceptable(flat(subject))).toBe(true);
    });
  });

  describe('line-break handling', () => {
    it.each([
      ['LF', '\n'],
      ['CRLF', '\r\n'],
      ['bare CR', '\r'],
      ['NEL U+0085', NEL],
      ['LINE SEPARATOR U+2028', LS],
      ['PARAGRAPH SEPARATOR U+2029', PS],
    ])('joins across %s', (_label, brk) => {
      expect(flat(`send a towel${brk}to 404`)).toBe('send a towel. to 404');
    });

    it('collapses blank lines instead of emitting empty sentences', () => {
      expect(flat('AC not working\n\n\nRoom 210')).toBe('AC not working. Room 210');
    });

    it('handles a mix of break types in one message', () => {
      expect(flat(`one\ntwo\r\nthree\rfour${LS}five`)).toBe('one. two. three. four. five');
    });

    it('flattens a five-line message', () => {
      const v = flat('Hi\nplease send\n2 towels\n1 soap\nRoom 302');
      expect(v).toBe('Hi. please send. 2 towels. 1 soap. Room 302');
      expect(isAcceptable(v)).toBe(true);
    });
  });

  describe('punctuation', () => {
    it('does not double up a full stop', () => {
      expect(flat('AC is not working.\nPlease send someone')).toBe(
        'AC is not working. Please send someone',
      );
    });

    it.each(['!', '?', ',', ';', ':'])('does not add a stop after "%s"', (p) => {
      expect(flat(`line one${p}\nline two`)).toBe(`line one${p} line two`);
    });

    it('leaves the trailing punctuation of the last line alone', () => {
      expect(flat('is breakfast included?\nRoom 101.')).toBe(
        'is breakfast included? Room 101.',
      );
    });

    it('adds a stop after an emoji-terminated line', () => {
      expect(flat('Thanks a lot ' + String.fromCodePoint(0x1f64f) + '\nRoom 404')).toBe(
        'Thanks a lot ' + String.fromCodePoint(0x1f64f) + '. Room 404',
      );
    });

    it('keeps a bulleted list legible', () => {
      expect(flat('Please send:\n- towel\n- soap')).toBe('Please send: - towel. - soap');
    });
  });

  describe('the other two banned shapes', () => {
    it('replaces tabs with a single space', () => {
      const v = flat('Room\t404\tneeds\tcleaning');
      expect(v).toBe('Room 404 needs cleaning');
      expect(isAcceptable(v)).toBe(true);
    });

    it('collapses a run of more than four spaces', () => {
      const v = flat('towel' + ' '.repeat(12) + 'please');
      expect(v).toBe('towel please');
      expect(isAcceptable(v)).toBe(true);
    });

    it.each([
      ['NBSP', NBSP],
      ['zero-width space', ZWSP],
      ['ideographic space', IDEO_SPACE],
      ['vertical tab', '\v'],
      ['form feed', '\f'],
    ])('folds %s into a plain space', (_label, c) => {
      expect(flat(`send${c}${c}${c}${c}${c}${c}a towel`)).toBe('send a towel');
    });
  });

  describe('values that must pass through untouched', () => {
    it.each([
      'Extra towels',
      'NA',
      '101 A',
      'Rooms 302, 303 and 304',
      '30 min',
      '5f3c1d2e-9a44-4b1e-9d55-77a1c2b3d4e5',
      'Vibe House Koramangala',
      'Rs. 1,250',
      'AC not cooling in 206 - please check',
    ])('leaves %j unchanged', (v) => {
      expect(flat(v)).toBe(v);
    });

    it('does not touch a normal single-line sentence with one space run', () => {
      expect(flat('please send  two towels')).toBe('please send two towels');
    });
  });

  describe('degenerate input', () => {
    it.each([
      [null, ''],
      [undefined, ''],
      ['', ''],
      ['   ', ''],
      ['\n\n\n', ''],
      ['\t', ''],
    ])('maps %j to %j', (input, expected) => {
      expect(flat(input as string | null | undefined)).toBe(expected);
    });

    it('trims surrounding whitespace', () => {
      expect(flat('  towel please  ')).toBe('towel please');
    });

    it('handles a single line with no breaks at all', () => {
      expect(flat('towel')).toBe('towel');
    });
  });

  describe('length cap', () => {
    it('leaves a value at the limit alone', () => {
      const v = 'a'.repeat(1000);
      expect(flat(v)).toBe(v);
    });

    it('truncates past the limit and marks it', () => {
      const v = flat(('word '.repeat(400)).trim());
      expect(v.length).toBeLessThanOrEqual(1000);
      expect(v.endsWith(ELLIPSIS)).toBe(true);
      expect(v.endsWith(' ' + ELLIPSIS)).toBe(false); // no dangling space
    });

    it('hard-cuts a single enormous token rather than returning nothing', () => {
      const v = flat('x'.repeat(5000));
      expect(v.length).toBe(1000);
      expect(v.endsWith(ELLIPSIS)).toBe(true);
    });
  });

  describe('property: output is always sendable', () => {
    const nasty = [
      'towel\nat 404\nand 405',
      'AC\t\tbroken\r\n\r\nroom     210',
      `${LS}${PS}${NEL}`,
      'Please      send\nsoap',
      '   ',
      'a'.repeat(4000) + '\n' + 'b'.repeat(4000),
      'line1\n'.repeat(200),
    ];
    it.each(nasty)('%j survives the WhatsApp rule', (input) => {
      expect(isAcceptable(flat(input))).toBe(true);
    });
  });
});

describe('flattenTemplateParams', () => {
  it('preserves order and names while rewriting values', () => {
    const out = flattenTemplateParams([
      { name: 'system', value: 'TDS' },
      { name: 'text', value: 'Guest ordered food\nRoom 505' },
      { name: 'roomNo', value: '505' },
      { name: 'userName', value: 'Anita' },
    ]);
    expect(out.map((p) => p.name)).toEqual(['system', 'text', 'roomNo', 'userName']);
    expect(out[1].value).toBe('Guest ordered food. Room 505');
    expect(out[0].value).toBe('TDS');
    expect(out[2].value).toBe('505');
  });

  it('is a no-op for a clean parameter set', () => {
    const params = [
      { name: 'name', value: 'Ravi' },
      { name: 'request', value: 'Extra pillow' },
      { name: 'room_no', value: '101 A' },
      { name: 'turn_around_time', value: '30 min' },
    ];
    expect(flattenTemplateParams(params)).toEqual(params);
  });

  it('returns a new array and does not mutate the caller"s', () => {
    const params = [{ name: 'text', value: 'a\nb' }];
    const out = flattenTemplateParams(params);
    expect(params[0].value).toBe('a\nb');
    expect(out[0].value).toBe('a. b');
    expect(out).not.toBe(params);
  });
});
