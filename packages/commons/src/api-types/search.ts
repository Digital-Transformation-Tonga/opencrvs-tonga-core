/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface HapiRoutes {
  get: {
    '/ping': {
      request: never
      response: never
      params: never
    }
    '/tokenTest': {
      request: never
      response: never
      params: never
    }
    '/records/{recordId}': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/reindex/status/{jobId}': {
      request: never
      response: never
      params: {
        jobId: string
      }
    }
  }
  post: {
    '/advancedRecordSearch': {
      request: never
      response: never
      params: never
    }
    '/record': {
      request: never
      response: never
      params: never
    }
    '/reindex': {
      request: never
      response: never
      params: never
    }
    '/statusWiseRegistrationCount': {
      request: {
        declarationJurisdictionId?: string
        status: unknown[]
        event?: string
      }
      response: never
      params: never
    }
    '/events/assigned': {
      request: never
      response: never
      params: never
    }
    '/events/not-duplicate': {
      request: never
      response: never
      params: never
    }
    '/events/unassigned': {
      request: never
      response: never
      params: never
    }
    '/search/all': {
      request: never
      response: never
      params: never
    }
    '/search/assignment': {
      request: never
      response: never
      params: never
    }
    '/events/birth/{eventType}': {
      request: never
      response: never
      params: {
        eventType: string
      }
    }
    '/events/death/{eventType}': {
      request: never
      response: never
      params: {
        eventType: string
      }
    }
    '/events/marriage/{eventType}': {
      request: never
      response: never
      params: {
        eventType: string
      }
    }
    '/search/duplicates/birth': {
      request: never
      response: never
      params: never
    }
    '/search/duplicates/death': {
      request: never
      response: never
      params: never
    }
  }
  put?: {}
  delete: {
    '/elasticIndex': {
      request: never
      response: never
      params: never
    }
  }
}