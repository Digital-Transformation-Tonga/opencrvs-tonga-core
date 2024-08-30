import { getOrCreateClient } from '@search/elasticsearch/client'
import { deleteComposition } from '@search/elasticsearch/dbhelper'

export async function deleteRecord(recordId: string) {
  const client = getOrCreateClient()
  return deleteComposition(recordId, client)
}
