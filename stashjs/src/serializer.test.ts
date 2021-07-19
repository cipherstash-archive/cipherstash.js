import { deserialize, serialize } from "./serializer"

describe("serializer", () => {
  it("roundtrips an object containing a bigint", () => {
    const obj = {
      amount: 9223372036854775807n
    }
    const serialized = serialize(obj)
    const deserialized = deserialize(serialized)

    expect(deserialized).toStrictEqual(obj)
    expect(deserialized.amount).toStrictEqual(9223372036854775807n)
  })

  it("roundtrips an object containing a Buffer (1)", () => {
    const obj = {
      id: Buffer.from('abcdef0123456789', 'hex')
    }

    const serialized = serialize(obj)
    const deserialized = deserialize(serialized)

    expect(deserialized).toStrictEqual(obj)
    expect(deserialized.id).toBeInstanceOf(Buffer)
  })

  it("roundtrips an object containing a Buffer (2)", () => {
    const obj = {
      id: Buffer.from([161,210,241,196,98,6,70,45,178,7,191,49,234,90,218,13]),
      name: "Ada Lovelace",
      jobTitle: "Chief Executive Officer (CEO)",
      dateOfBirth: new Date(Date.now()),
      email: "ada@security4u.example",
      grossSalary: 250000
    }

    const serialized = serialize(obj)
    const deserialized = deserialize(serialized)

    expect(deserialized).toStrictEqual(obj)
    expect(deserialized.id).toBeInstanceOf(Buffer)
  })

  it("roundtrips an object containing a Date", () => {
    const obj = {
      date: new Date(Date.now())
    }

    const serialized = serialize(obj)
    const deserialized = deserialize(serialized)

    expect(deserialized).toStrictEqual(obj)
    expect(deserialized.date).toBeInstanceOf(Date)
  })
})