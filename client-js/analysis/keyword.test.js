const Keyword = require('./keyword');

test('term generates an 8-byte BE buffer, field=0 (siphash)', () => {
  const kw = new Keyword();
  const result = kw.perform("foo@example.com");

  expect(result).toEqual([Buffer.from([107, 144,133,186,168,85, 203, 159])])
});

test('correctly sets the field value (truncating the SIPhash)', () => {
  const kw = new Keyword();
  const result = kw.perform("foo@example.com");

  expect(result).toEqual([Buffer.from([107, 144,133,186,168,85, 203, 159])])
});

describe('query analysis', () => {
  test('that term generates for the "==" predicate', () => {
    const kw = new Keyword();
    const result = kw.performForQuery("==", "foo@example.com");

    expect(result).toEqual([Buffer.from([107, 144,133,186,168,85, 203, 159])])
  });
});
