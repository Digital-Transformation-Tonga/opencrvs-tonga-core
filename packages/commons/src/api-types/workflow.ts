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
  }
  post: {
    '/create-record': {
      request: never
      response: never
      params: never
    }
    '/download-record': {
      request: never
      response: never
      params: never
    }
    '/unassign-record': {
      request: never
      response: never
      params: never
    }
    '/confirm/registration': {
      request: never
      response: never
      params: never
    }
    '/records/event-notification': {
      request: never
      response: never
      params: never
    }
    '/records/{recordId}/make-correction': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/reject-correction': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/reinstate': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/archive': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/certify-record': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/update': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{id}/verify': {
      request: never
      response: never
      params: {
        id: string
      }
    }
    '/records/{id}/view': {
      request: never
      response: never
      params: {
        id: string
      }
    }
    '/records/{id}/duplicate': {
      request: never
      response: never
      params: {
        id: string
      }
    }
    '/records/{id}/not-duplicate': {
      request: never
      response: never
      params: {
        id: string
      }
    }
    '/records/{recordId}/validate': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/register': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/issue-record': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/reject': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/approve-correction': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
    '/records/{recordId}/request-correction': {
      request: never
      response: never
      params: {
        recordId: string
      }
    }
  }
  put?: {}
  delete?: {}
}