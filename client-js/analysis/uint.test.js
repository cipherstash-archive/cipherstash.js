const Uint = require('./uint');

test('field is written into header byte and number term in remaining bytes', () => {
  const uint = new Uint()
  const [result] = uint.perform(100)

  expect(result.readUInt8()).toEqual(0)
  expect(result.readUInt8(7)).toEqual(100)
});

test('BigInt values larger than 7 bytes are truncated', () => {
  const uint = new Uint()
  const [result] = uint.perform(Buffer.from([10, 10, 10, 10, 10, 10, 10, 10]).readBigUint64BE())

  expect(result).toEqual(Buffer.from([10, 10, 10, 10, 10, 10, 10, 10]))
});


// TODO: Test negative numbers

