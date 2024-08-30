import { logger } from '../logger'

type Saga<R> = (run: <T>(effect: SideEffect<T>) => Promise<T>) => Promise<R>

export async function saga<R>(callback: Saga<R>): Promise<R> {
  const rollbacks: (() => Promise<any>)[] = []
  async function run(sideEffect: SideEffect<any>) {
    try {
      logger.info(`Running side effect: ${sideEffect.label}`)
      const result = await sideEffect.commit()
      rollbacks.unshift(async () => {
        logger.info(`Rolling back side effect: ${sideEffect.label}`)

        try {
          await sideEffect.rollback(result)
        } catch (e) {
          logger.error(
            `Error during rollback: ${sideEffect.label}. Error: ${e.message}`
          )
        }
      })
      return result
    } catch (e) {
      for (const rollback of rollbacks) {
        await rollback()
      }
      throw e
    }
  }
  return callback(run)
}

type SideEffect<T> = {
  commit: () => Promise<T>
  rollback: (param: T) => Promise<any>
  label?: string
}

export function effect<T>(
  commit: () => Promise<T>,
  rollback: (param: T) => Promise<any>,
  label?: string
): SideEffect<T> {
  return {
    commit,
    rollback,
    label
  }
}
