import {
  createStore,
  del as idbDel,
  get as idbGet,
  keys as idbKeys,
  set as idbSet,
  type UseStore
} from 'idb-keyval'
import { IDB_KEYVAL_DB } from './idbKeyvalRecovery'

const STORE_NAME = 'keyval'

/**
 * idb-keyval caches the open IDB connection. After deleteDatabase(), that
 * connection is dead and every get/set throws UnknownError: Internal error
 * until we discard it and createStore() again.
 */
let store: UseStore = createStore(IDB_KEYVAL_DB, STORE_NAME)
let generation = 0

export const getIdbStoreGeneration = () => generation

export const getIdbStore = () => store

/** Point later ops at a fresh connection (call after rebuildKeyvalDatabase). */
export const resetIdbStore = () => {
  generation += 1
  store = createStore(IDB_KEYVAL_DB, STORE_NAME)
  return store
}

export const idbGetItem = <T = unknown>(key: IDBValidKey) =>
  idbGet<T>(key, store)

export const idbSetItem = <T = unknown>(key: IDBValidKey, value: T) =>
  idbSet(key, value, store)

export const idbDelItem = (key: IDBValidKey) => idbDel(key, store)

export const idbListKeys = () => idbKeys(store)
