import { saga, effect } from '.'

test('executes invocations in order', async () => {
  const result = await saga<number>(async (run) => {
    const a = await run(
      effect(
        () => Promise.resolve(1),
        () => Promise.resolve()
      )
    )
    const b = await run(
      effect(
        () => Promise.resolve(a + 1),
        () => Promise.resolve()
      )
    )
    const c = await run(
      effect(
        () => Promise.resolve(b + 1),
        () => Promise.resolve()
      )
    )
    return c
  })
  expect(result).toBe(3)
})

test('executes compensates in order if anything fails', async () => {
  const compensateSpy = jest.fn()

  const result = saga<number>(async (run) => {
    const a = await run(
      effect(
        () => Promise.resolve(1),
        () => compensateSpy('compensate 1')
      )
    )
    await run(
      effect(
        () => Promise.resolve(a + 1),
        () => compensateSpy('compensate 2')
      )
    )
    const c = await run(
      effect(
        () => Promise.reject(new Error('error')),
        () => compensateSpy('compensate 3')
      )
    )

    return c
  })

  await expect(result).rejects.toThrowError('error')
  expect(compensateSpy).toHaveBeenCalledTimes(2)
  expect(compensateSpy).toHaveBeenCalledWith('compensate 2')
  expect(compensateSpy).toHaveBeenCalledWith('compensate 1')
})

test('executes all compensates even if one of them fails', async () => {
  const compensateSpy = jest.fn()

  const result = saga<number>(async (run) => {
    const a = await run(
      effect(
        () => Promise.resolve(1),
        () => compensateSpy('compensate 1')
      )
    )
    await run(
      effect(
        () => Promise.resolve(a + 1),
        () => Promise.reject(new Error('error'))
      )
    )
    const c = await run(
      effect(
        () => Promise.reject(new Error('error')),
        () => compensateSpy('compensate 3')
      )
    )

    return c
  })

  await expect(result).rejects.toThrowError('error')
  expect(compensateSpy).toHaveBeenCalledTimes(1)
  expect(compensateSpy).toHaveBeenCalledWith('compensate 1')
})
test('compensate handler receives the invoke return value as a parameter', async () => {
  const compensateSpy = jest.fn()
  const shouldNotBeCalled = jest.fn(() => {
    throw new Error('This function should not have been called')
  })
  const result = saga<number>(async (run) => {
    const a = await run(
      effect(
        () => Promise.resolve(1),
        () => compensateSpy('compensate 1')
      )
    )
    await run(effect(() => Promise.resolve(a + 1), compensateSpy))

    const c = await run(
      effect(() => Promise.reject(new Error('error')), shouldNotBeCalled)
    )

    return c
  })

  await expect(result).rejects.toThrowError('error')
  expect(compensateSpy).toHaveBeenCalledTimes(2)
  expect(compensateSpy).toHaveBeenCalledWith(2)
  expect(compensateSpy).toHaveBeenCalledWith('compensate 1')
})
