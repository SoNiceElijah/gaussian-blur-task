import { expect, test } from 'vitest'
import { is, create } from '../src/messages/messages'

test("[DONE] Can create and determine message", () => {
    const message = create.message.done(true)

    const found = is(message).done(() => { })
    expect(found).toBeTruthy()

    const notFound = is(message).update(() => {})
    expect(notFound).toBeFalsy()
})

test("[BEGINCOOP] Can create and determine basic message", () => {
    const message = create.message.beginCoop(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    )

    const found = is(message).beginMultiple(() => { })
    expect(found).toBeTruthy()

    const notFound = is(message).update(() => {})
    expect(notFound).toBeFalsy()
})

test("[BEGINSINGLE] Can create and determine basic message", () => {
    const message = create.message.beginSingle(
        {} as any,
        {} as any,
        {} as any,
    )

    const found = is(message).beginSingle(() => { })
    expect(found).toBeTruthy()

    const notFound = is(message).update(() => {})
    expect(notFound).toBeFalsy()
})

test("[UPDATE] Can create and determine basic message", () => {
    const message = create.message.update(10)

    const found = is(message).update(() => { })
    expect(found).toBeTruthy()

    const notFound = is(message).done(() => {})
    expect(notFound).toBeFalsy()
})

test("Can wrap message", () => {
    const message = create.wrapper.pool(
        0, 0, 1, create.message.update(5)
    )

    const found = is(message).pool((x) => {
        const contentFound = is(x.content).update((u) => {
            expect(u.chunk).toBe(5)
        })
        expect(contentFound).toBeTruthy()
    })
    expect(found).toBeTruthy()
})
