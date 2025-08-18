/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import { MessageDescriptor } from 'react-intl'
import { validationMessages as messages } from '@client/i18n/messages'
import {
  REGEXP_BLOCK_ALPHA_NUMERIC_DOT,
  REGEXP_DECIMAL_POINT_NUMBER,
  NATIONAL_ID
} from '@client/utils/constants'
import { validate as validateEmail } from 'email-validator'
import XRegExp from 'xregexp'
import { IOfflineData } from '@client/offline/reducer'
import _, { get } from 'lodash'
import format, { convertAgeToDate } from '@client/utils/date-formatting'

export function getListOfLocations(
  resource: IOfflineData,
  resourceType: Extract<
    keyof IOfflineData,
    'facilities' | 'locations' | 'offices'
  >
) {
  return resource[resourceType]
}

// @TODO: Importing from forms breaks the tests. Basically the references are not resolved correctly
// and @opencrvs/client/src/forms causes recursion in this branch.
// https://github.com/vitest-dev/vitest/issues/546
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type IFormFieldValue = any
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type IFormData = any
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type IFormSectionData = any
/**
 * NOTE! When amending validators in this file, remember to also update country configuration typings to reflect the changes
 */

export interface IValidationResult {
  message: MessageDescriptor
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  props?: { [key: string]: any }
}

export type RangeValidation = (
  min: number,
  max: number
) => (value: IFormFieldValue) => IValidationResult | undefined

export type MaxLengthValidation = (
  customisation: number
) => (value: IFormFieldValue) => IValidationResult | undefined

export type Validation = (
  value: IFormFieldValue,
  drafts?: IFormData,
  offlineCountryConfig?: IOfflineData,
  form?: IFormSectionData
) => IValidationResult | undefined

/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type ValidationInitializer = (...value: any[]) => Validation

export const isAValidPhoneNumberFormat = (value: string): boolean => {
  const pattern = window.config.PHONE_NUMBER_PATTERN
  return new RegExp(pattern).test(value)
}

export const isAValidEmailAddressFormat = (value: string): boolean => {
  return validateEmail(value)
}

export const isAValidDateFormat = (value: string): boolean => {
  const dateFormatRegex = '^\\d{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])$'
  const dateRegex = new RegExp(dateFormatRegex)

  if (!dateRegex.test(value)) {
    return false
  }

  const pad = (n: number) => {
    return (str: string) => {
      while (str.length < n) {
        str = '0' + str
      }
      return str
    }
  }

  const valueISOString = value.split(/-/g).map(pad(2)).join('-')

  const givenDate = new Date(valueISOString)

  return givenDate.toISOString().slice(0, 10) === valueISOString
}

export const requiredBasic: Validation = (value: IFormFieldValue) =>
  value ? undefined : { message: messages.requiredBasic }

export const requiredSymbol: Validation = (value: IFormFieldValue) =>
  value ? undefined : { message: messages.requiredSymbol }

export const required =
  (message: MessageDescriptor = messages.required): Validation =>
  (value: IFormFieldValue) => {
    if (typeof value === 'string') {
      return value !== '' ? undefined : { message }
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? undefined : { message }
    }
    return value !== undefined && value !== null ? undefined : { message }
  }

export const minLength = (min: number) => (value: string) => {
  return value && value.length < min
    ? { message: messages.minLength, props: { min } }
    : undefined
}

export const validLength = (length: number) => (value: IFormFieldValue) => {
  return value && value.toString().length === length
    ? undefined
    : {
        message: messages.validNationalId,
        props: { validLength: length }
      }
}

const isLessOrEqual = (value: string, max: number) => {
  return value && value.toString().length <= max
}

export const maxLength: MaxLengthValidation =
  (max: number) => (value: IFormFieldValue) => {
    return isLessOrEqual(value as string, max)
      ? undefined
      : { message: messages.maxLength, props: { max } }
  }

const isNumber = (value: string): boolean => !value || !isNaN(Number(value))

const isRegexpMatched = (value: string, regexp: string): boolean =>
  !value || value.match(regexp) !== null

export const blockAlphaNumericDot: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  return isRegexpMatched(cast, REGEXP_BLOCK_ALPHA_NUMERIC_DOT)
    ? undefined
    : { message: messages.blockAlphaNumericDot }
}

export const nonDecimalPointNumber: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  if (cast) {
    return !isRegexpMatched(cast.toString(), REGEXP_DECIMAL_POINT_NUMBER)
      ? undefined
      : { message: messages.nonDecimalPointNumber }
  }
}

export const numeric: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  return isNumber(cast) ? undefined : { message: messages.numberRequired }
}

export const facilityMustBeSelected: Validation = (
  value: IFormFieldValue,
  drafts,
  offlineCountryConfig
) => {
  const locationsList = getListOfLocations(
    offlineCountryConfig as IOfflineData,
    'facilities'
  )
  const isValid = !value || locationsList[value as string]
  return isValid ? undefined : { message: messages.facilityMustBeSelected }
}

export const officeMustBeSelected: Validation = (
  value: IFormFieldValue,
  drafts,
  offlineCountryConfig
) => {
  const locationsList = getListOfLocations(
    offlineCountryConfig as IOfflineData,
    'offices'
  )
  const isValid = !value || locationsList[value as string]
  return isValid ? undefined : { message: messages.officeMustBeSelected }
}

export const phoneNumberFormat: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  const trimmedValue = cast === undefined || cast === null ? '' : cast.trim()

  if (!trimmedValue) {
    return undefined
  }

  return isAValidPhoneNumberFormat(trimmedValue)
    ? undefined
    : {
        message: messages.phoneNumberFormat
      }
}

export const emailAddressFormat: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  if (cast === '') {
    return
  }

  return cast && isAValidEmailAddressFormat(cast)
    ? undefined
    : {
        message: messages.emailAddressFormat
      }
}

export const dateFormat: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  return cast && isAValidDateFormat(cast)
    ? undefined
    : {
        message: messages.dateFormat
      }
}

export const isDateNotInFuture = (date: string) => {
  return new Date(date) <= new Date(Date.now())
}

export const isDateNotBeforeBirth = (date: string, drafts: IFormData) => {
  const birthDate = drafts?.deceased?.birthDate as string
  return birthDate ? new Date(date) >= new Date(birthDate) : true
}

export const isDateNotAfterBirthEvent = (date: string, drafts?: IFormData) => {
  const dateOfBirth = drafts?.child?.childBirthDate as string
  return dateOfBirth ? new Date(date) <= new Date(dateOfBirth) : true
}

export const isDateNotAfterDeath = (date: string, drafts?: IFormData) => {
  const deathDate = drafts?.deathEvent?.deathDate as string
  return deathDate
    ? new Date(date).setHours(0, 0, 0, 0) <=
        new Date(deathDate).setHours(0, 0, 0, 0)
    : true
}

export const isDateAfter = (first: string, second: string) => {
  return new Date(first) >= new Date(second)
}

export const minAgeGapExist = (
  first: string,
  second: string,
  minAgeGap: number
): boolean => {
  const diff =
    (new Date(first).getTime() - new Date(second).getTime()) /
    (1000 * 60 * 60 * 24) /
    365
  return diff >= minAgeGap
}

export const isAgeInYearsBetween =
  (min: number, max?: number): Validation =>
  (value: IFormFieldValue) => {
    const dateFormat = /^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/
    if (value && dateFormat.test(value.toString())) {
      max = max || 120 // defaulting to 120 years as max if max is not provided
      const today = new Date()
      const dateOfBirth = new Date(value.toString())
      const ageFromDateOfBirth = today.getFullYear() - dateOfBirth.getFullYear()

      const ageIsWithinRange =
        ageFromDateOfBirth >= min && ageFromDateOfBirth <= max
      if (ageIsWithinRange) return undefined

      return {
        message: messages.isAgeInYearsBetween,
        props: { min, max }
      }
    }
    return undefined
  }

export const isValidBirthDate: Validation = (
  value: IFormFieldValue,
  drafts?
) => {
  const cast = value as string
  return !cast
    ? { message: messages.required }
    : cast &&
      isDateNotInFuture(cast) &&
      isAValidDateFormat(cast) &&
      isDateNotAfterBirthEvent(cast, drafts as IFormData)
    ? isDateNotAfterDeath(cast, drafts as IFormData)
      ? undefined
      : {
          message: messages.isDateNotAfterDeath
        }
    : {
        message: messages.isValidBirthDate
      }
}

export const isValidChildBirthDate: Validation = (value: IFormFieldValue) => {
  const childBirthDate = value as string

  return !childBirthDate
    ? { message: messages.required }
    : childBirthDate &&
      isAValidDateFormat(childBirthDate) &&
      isDateNotInFuture(childBirthDate)
    ? undefined
    : { message: messages.isValidBirthDate }
}

export const isValidParentsBirthDate =
  (minAgeGap: number, isAge?: boolean): Validation =>
  (value: IFormFieldValue, drafts) => {
    const parentsBirthDate = isAge
      ? convertAgeToDate(value as string)
      : (value as string)
    const childBirthDate =
      drafts && drafts.child && (drafts.child.childBirthDate as string)

    return parentsBirthDate &&
      isAValidDateFormat(parentsBirthDate) &&
      isDateNotInFuture(parentsBirthDate)
      ? childBirthDate
        ? minAgeGapExist(childBirthDate, parentsBirthDate, minAgeGap)
          ? undefined
          : {
              message: messages.isValidBirthDate
            }
        : undefined
      : {
          message: messages.isValidBirthDate
        }
  }

export const checkBirthDate =
  (marriageDate: string): Validation =>
  (value: IFormFieldValue) => {
    const cast = value as string
    if (!isAValidDateFormat(cast)) {
      return {
        message: messages.dateFormat
      }
    }

    const bDate = new Date(cast)
    // didn't call `isDateNotInFuture(value)`, because no need to call `new Date(value)` twice
    if (bDate > new Date()) {
      return {
        message: messages.dateFormat
      }
    }

    if (!marriageDate || !isAValidDateFormat(marriageDate)) {
      return undefined
    }

    return bDate < new Date(marriageDate)
      ? undefined
      : {
          message: messages.dobEarlierThanDom
        }
  }

const getBirthDate = (
  isExactDateOfBirthUnknown: boolean,
  date: string,
  age: string
) => (isExactDateOfBirthUnknown ? convertAgeToDate(age) : date)

export const checkMarriageDate =
  (minAge: number): Validation =>
  (value: IFormFieldValue, drafts) => {
    const cast = value as string
    if (!isAValidDateFormat(cast)) {
      return {
        message: messages.dateFormat
      }
    }

    const mDate = new Date(cast)
    // didn't call `isDateNotInFuture(value)`, because no need to call `new Date(value)` twice
    if (mDate > new Date()) {
      return {
        message: messages.dateFormat
      }
    }

    const groomDOB =
      drafts &&
      drafts.groom &&
      getBirthDate(
        Boolean(drafts.groom.exactDateOfBirthUnknown),
        String(drafts.groom.groomBirthDate),
        String(drafts.groom.ageOfIndividualInYears)
      )
    const brideDOB =
      drafts &&
      drafts.bride &&
      getBirthDate(
        Boolean(drafts.bride.exactDateOfBirthUnknown),
        String(drafts.bride.brideBirthDate),
        String(drafts.bride.ageOfIndividualInYears)
      )

    if (!groomDOB || !brideDOB) {
      return undefined
    } else {
      if (
        !minAgeGapExist(cast, groomDOB, minAge) ||
        !minAgeGapExist(cast, brideDOB, minAge)
      ) {
        return {
          message: messages.illegalMarriageAge
        }
      } else if (mDate < new Date(groomDOB) && mDate < new Date(brideDOB)) {
        return {
          message: messages.domLaterThanDob
        }
      } else {
        return undefined
      }
    }
  }

export const isValidDateOfBirthForMarriage =
  (sectionName: string, minAge: number): Validation =>
  (value: IFormFieldValue, drafts) => {
    const isExactDateOfBirthUnknown =
      drafts &&
      drafts[sectionName] &&
      drafts[sectionName].exactDateOfBirthUnknown
    const cast = isExactDateOfBirthUnknown
      ? convertAgeToDate(value as string)
      : (value as string)
    if (!isAValidDateFormat(cast)) {
      return {
        message: messages.dateFormat
      }
    } else if (!isDateNotInFuture(cast)) {
      return { message: messages.isValidBirthDate }
    }

    if (
      !minAgeGapExist(
        format(new Date(Date.now()), 'yyyy-MM-dd'),
        String(value),
        minAge
      )
    ) {
      return {
        message: messages.illegalMarriageAge
      }
    } else {
      return undefined
    }
  }

export const dateGreaterThan =
  (previousDate: string): Validation =>
  (value: IFormFieldValue) => {
    const cast = value as string
    if (!previousDate || !isAValidDateFormat(previousDate)) {
      return undefined
    }

    return new Date(cast) > new Date(previousDate)
      ? undefined
      : {
          message: messages.domLaterThanDob
        }
  }

export const dateLessThan =
  (laterDate: string): Validation =>
  (value: IFormFieldValue) => {
    const cast = value as string
    if (!laterDate || !isAValidDateFormat(laterDate)) {
      return undefined
    }

    return new Date(cast) < new Date(laterDate)
      ? undefined
      : {
          message: messages.dobEarlierThanDom
        }
  }

export const dateNotInFuture = (): Validation => (value: IFormFieldValue) => {
  const cast = value as string
  if (isDateNotInFuture(cast)) {
    return undefined
  } else {
    return { message: messages.dateFormat }
  }
}

export const dateNotToday = (date: string): boolean => {
  const today = new Date().setHours(0, 0, 0, 0)
  const day = new Date(date).setHours(0, 0, 0, 0)
  return day !== today
}

export const isDateInPast: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  if (isDateNotInFuture(cast) && dateNotToday(cast)) {
    return undefined
  } else {
    return { message: messages.isValidBirthDate } // specific to DOB of parent/informant
  }
}

export const dateInPast = (): Validation => (value: IFormFieldValue) =>
  isDateInPast(value)

export const dateFormatIsCorrect = (): Validation => (value: IFormFieldValue) =>
  dateFormat(value as string)

/*
 * TODO: The name validation functions should be refactored out.
 *
 * Name validation has some complexities. These will vary from country to
 * country too. e.g. in Bangladesh there is actually no given name or
 * family name. Or first name/last name. To fit names in the common western
 * format, people have to use multiple words in a "first name" or a "last name".
 *
 * Another complexity is what letters are allowed. Should we allow hyphens?
 * Then in Bengali, there are some rules which we can build to ensure better
 * quality input. e.g. a word can not start with a "mark" or diatribe.
 *
 * For now, we are going with simple validation that just prevents entering
 * an English name in the Bengali name field and vice versa.
 */

// Each character has to be a part of the Unicode Bengali script or the hyphen.

export const isValidBengaliWord = (value: string): boolean => {
  const bengaliRe = XRegExp.cache(
    '(^[\\p{Bengali}.-]*\\([\\p{Bengali}.-]+\\)[\\p{Bengali}.-]*$)|(^[\\p{Bengali}.-]+$)',
    ''
  )
  const lettersRe = XRegExp.cache(
    '(^[\\pL\\pM.-]*\\([\\pL\\pM.-]+\\)[\\pL\\pM.-]*$)|(^[\\pL\\pM.-]+$)',
    ''
  )

  return bengaliRe.test(value) && lettersRe.test(value)
}

//
// Simple pattern. Allow only English (Latin) characters and the hyphen.
//
export const isValidEnglishWord = (value: string): boolean => {
  // Still using XRegExp for its caching ability
  const englishRe = XRegExp.cache(
    `(^[\\p{Latin}0-9'.ʻ_-]*\\([\\p{Latin}0-9'.ʻ_-]+\\)[\\p{Latin}0-9'.ʻ_-]*$)|(^[\\p{Latin}0-9'.ʻ_-]+$)`,
    ''
  )
  return englishRe.test(value)
}

type Checker = (value: string) => boolean

// Utility 2nd order function. Does a little common task then passes on to
// the callback.

const checkNameWords = (value: string, checker: Checker): boolean => {
  const trimmedValue = value === undefined || value === null ? '' : value.trim()

  if (!trimmedValue) {
    return true
  }

  const parts: string[] = trimmedValue.split(/\s+/)
  return parts.every(checker)
}

export const isValidBengaliName = (value: string): boolean => {
  return checkNameWords(value, isValidBengaliWord)
}

export const isValidEnglishName = (value: string): boolean => {
  return checkNameWords(value, isValidEnglishWord)
}

export const isLengthWithinRange = (value: string, min: number, max: number) =>
  !value || (value.length >= min && value.length <= max)

export const isValueWithinRange =
  (min: number, max: number) =>
  (value: number): boolean => {
    return !isNaN(value) && value >= min && value <= max
  }

export const bengaliOnlyNameFormat: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  return isValidBengaliName(cast)
    ? undefined
    : { message: messages.bengaliOnlyNameFormat }
}

export const englishOnlyNameFormat: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  return isValidEnglishName(cast)
    ? undefined
    : { message: messages.englishOnlyNameFormat }
}

const specialCharactersRegex = /^[^!@#$%^&*()+={}[\]\\|/?<>:;~,0-9]+$/

export const hasSpecialCharacters: Validation = (value: IFormFieldValue) => {
  const cast = value as string
  if (value) {
    return specialCharactersRegex.test(cast)
      ? undefined
      : { message: messages.hasSpecialCharacters }
  }
}

export const range: RangeValidation =
  (min: number, max: number) => (value: IFormFieldValue) => {
    const cast = value as string
    return isValueWithinRange(min, max)(parseFloat(cast))
      ? undefined
      : { message: messages.range, props: { min, max } }
  }

export const oneOf = (
  fields: string[],
  errorMessage: MessageDescriptor
): Validation => {
  return (_value, fieldValues) => {
    const someFilled = fields.some((field) => get(fieldValues, field))

    if (someFilled) {
      return undefined
    }

    return { message: errorMessage }
  }
}

export const isAValidNIDNumberFormat = (value: string): boolean => {
  const pattern = window.config.NID_NUMBER_PATTERN
  return new RegExp(pattern).test(value)
}

export const validIDNumber =
  (configCase: string): Validation =>
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  (value: any, drafts) => {
    value = (value && value.toString()) || ''

    const cast = value as string
    const trimmedValue = cast === undefined || cast === null ? '' : cast.trim()
    const idType = _.get(drafts, `${configCase}.${configCase}IdType`)
    const nationality = _.get(drafts, `${configCase}.nationality`)

    if (nationality !== 'TON') {
      return undefined
    } else {
      if (idType && idType === NATIONAL_ID) {
        if (isAValidNIDNumberFormat(trimmedValue) || !trimmedValue) {
          return undefined
        }

        return {
          message: messages.validNationalId
        }
      }
    }
    return undefined
  }

export const duplicateIDNumber =
  (
    fieldToDuplicateCheck: string,
    personToCheck: string,
    personToCheckedWith: string
  ): Validation =>
  (value: IFormFieldValue, drafts) => {
    const valueToCheck = _.get(drafts, fieldToDuplicateCheck)
    const idTypeToCompare = _.get(
      drafts,
      `${personToCheck}.${personToCheck}IdType`
    )
    const idTypeComparedWith = _.get(
      drafts,
      `${personToCheckedWith}.${personToCheckedWith}IdType`
    )
    if (
      idTypeToCompare &&
      idTypeComparedWith &&
      idTypeToCompare === idTypeComparedWith
    ) {
      if (value && valueToCheck && value === valueToCheck) {
        return {
          message: messages.duplicateIDNumber
        }
      }
    }

    return undefined
  }

export const isValidDeathOccurrenceDate: Validation = (
  value: IFormFieldValue,
  drafts
) => {
  const cast = value && value.toString()
  return cast && isDateNotInFuture(cast) && isAValidDateFormat(cast)
    ? isDateNotBeforeBirth(cast, drafts as IFormData)
      ? undefined
      : {
          message: messages.isDateNotBeforeBirth
        }
    : {
        message: messages.isValidDateOfDeath
      }
}

export const isMoVisitDateAfterBirthDateAndBeforeDeathDate: Validation = (
  value: IFormFieldValue,
  drafts
) => {
  const cast = value && value.toString()
  if (drafts && drafts.deathEvent && !drafts.deathEvent.birthDate) {
    if (drafts && drafts.deathEvent && cast <= drafts.deathEvent.deathDate) {
      return undefined
    } else if (
      drafts &&
      drafts.deathEvent &&
      cast > drafts.deathEvent.deathDate
    ) {
      return {
        message: messages.isMoVisitAfterDeath
      }
    }
  } else {
    if (
      drafts &&
      drafts.deathEvent &&
      cast <= drafts.deathEvent.deathDate &&
      cast >= drafts.deceased.birthDate
    ) {
      return undefined
    } else if (
      drafts &&
      drafts.deathEvent &&
      cast > drafts.deathEvent.deathDate
    ) {
      return {
        message: messages.isMoVisitAfterDeath
      }
    } else if (
      drafts &&
      drafts.deathEvent &&
      cast < drafts.deceased.birthDate
    ) {
      return {
        message: messages.isMoVisitBeforeBirth
      }
    }
  }
}

export const greaterThanZero: Validation = (value: IFormFieldValue) => {
  return !value && value !== 0
    ? { message: messages.required }
    : value && Number(value) > 0
    ? undefined
    : { message: messages.greaterThanZero }
}

export const notGreaterThan =
  (maxValue: number): Validation =>
  (value: IFormFieldValue) => {
    const numericValue = Number.parseInt(value as string)
    return value && !Number.isNaN(numericValue) && numericValue <= maxValue
      ? undefined
      : { message: messages.notGreaterThan, props: { maxValue } }
  }

export const validateMaxFileSize = (value: IFormFieldValue) => {
  const maxFileSize = 5 * 1024 * 1024 // 5MB

  if (value) {
    const base64Value = value.data as string
    const base64Data = base64Value.split(',')[1] || base64Value
    const padding = (base64Data.match(/=+$/) || [''])[0].length
    const binarySizeinBytes = (base64Data.length * 3) / 4 - padding

    if (binarySizeinBytes > maxFileSize) {
      return {
        message: {
          defaultMessage: 'File size must be less than 5MB',
          description: 'text for error on file size',
          id: 'validateMaxFileSize'
        }
      } satisfies IValidationResult
    }
  }

  return undefined
}

const dateFormatRegex = /^\d{4}-(\d{1,2})-(\d{1,2})$/

const returnAbsoluteMonthDifference = (
  personBirthDate: any,
  parentBirthDate: any
) => {
  if (
    dateFormatRegex.test(personBirthDate) &&
    dateFormatRegex.test(parentBirthDate)
  ) {
    const [personBirthyear, personBirthMonth] = personBirthDate
      .split('-')
      .map(Number)

    const [parentBirthyear, parentBirthMonth] = parentBirthDate
      .split('-')
      .map(Number)

    return Math.abs(
      personBirthyear * 12 +
        personBirthMonth -
        (parentBirthyear * 12 + parentBirthMonth)
    )
  }
}

const checkAgeGapInMonths = (
  personBirthDate: any,
  parentBirthDate: any,
  person: 'child' | 'deceased',
  parent: 'mother' | 'father'
) => {
  const AGE_GAP_BETWEEN_PERSON_AND_PARENT = 144 // 144 months --> 12 years

  if (personBirthDate && parentBirthDate) {
    const monthDifference = returnAbsoluteMonthDifference(
      personBirthDate,
      parentBirthDate
    )

    if (
      monthDifference &&
      monthDifference < AGE_GAP_BETWEEN_PERSON_AND_PARENT
    ) {
      return {
        message: {
          defaultMessage: `Invalid age gap between the ${person} & the ${parent}`,
          description:
            'The error message appears when the age gap between the person & the parent is invalid',
          id: 'checkAgeGapInMonths'
        }
      }
    }
  }

  return undefined
}

export const validateChildMotherAgeGap: Validation = (value, drafts) => {
  if (dateFormatRegex.test(value)) {
    const childBirthDate = drafts.child?.childBirthDate
    const motherBirthDate = drafts.mother?.motherBirthDate

    return checkAgeGapInMonths(
      childBirthDate,
      motherBirthDate,
      'child',
      'mother'
    )
  }
  return undefined
}

export const validateChildFatherAgeGap: Validation = (value, drafts) => {
  if (dateFormatRegex.test(value)) {
    const childBirthDate = drafts.child?.childBirthDate
    const fatherBirthDate = drafts.father?.fatherBirthDate

    return checkAgeGapInMonths(
      childBirthDate,
      fatherBirthDate,
      'child',
      'father'
    )
  }
  return undefined
}

export const validateDeceasedMotherAgeGap: Validation = (value, drafts) => {
  if (dateFormatRegex.test(value)) {
    const deceasedBirthDate = drafts.deceased?.deceasedBirthDate
    const motherBirthDate = drafts.mother?.motherBirthDate

    return checkAgeGapInMonths(
      deceasedBirthDate,
      motherBirthDate,
      'deceased',
      'mother'
    )
  }
  return undefined
}

export const validateDeceasedFatherAgeGap: Validation = (value, drafts) => {
  if (dateFormatRegex.test(value)) {
    const deceasedBirthDate = drafts.deceased?.deceasedBirthDate
    const fatherBirthDate = drafts.father?.fatherBirthDate

    return checkAgeGapInMonths(
      deceasedBirthDate,
      fatherBirthDate,
      'deceased',
      'father'
    )
  }
  return undefined
}

export const validateSpouseAndForeignSelection: Validation = (
  value,
  drafts
) => {
  const maritalStatus = drafts?.deceased?.maritalStatus
  const foreignDeath = drafts?.deceased?.foreignDeath

  if (value === 'SPOUSE' && maritalStatus !== 'MARRIED') {
    return {
      message: {
        defaultMessage:
          'Cannot select "Spouse" unless the deceased was married.',
        description:
          'Validation error when trying to select SPOUSE but deceased is not marked as married.',
        id: 'validateSpouseSelection'
      }
    }
  }

  if (value === 'FOREIGN' && foreignDeath !== 'true') {
    return {
      message: {
        defaultMessage:
          'Cannot select "Foreign Informant" unless the death occurred abroad.',
        description:
          'Validation error when trying to select FOREIGN location but foreignDeath is false.',
        id: 'validateForeignSelection'
      }
    }
  }

  return undefined
}

const checkAgeGapInYears = (drafts: IFormData, parent: 'mother' | 'father') => {
  const AGE_GAP = 12 // 12 years
  const deceasedBirthDate = drafts?.deceased?.ageOfIndividualInYears

  let parentBirthDate = drafts?.mother?.ageOfIndividualInYears
  if (parent === 'father') {
    parentBirthDate = drafts?.father?.ageOfIndividualInYears
  }

  if (deceasedBirthDate) {
    if (parentBirthDate && parentBirthDate - deceasedBirthDate < AGE_GAP) {
      return {
        message: messages.isValidAgeGap
      }
    }
  }
  return undefined
}

export const isValidDeaceasedMotherAgeGap: Validation = (
  value: IFormFieldValue,
  drafts: IFormData
) => {
  return checkAgeGapInYears(drafts, 'mother')
}

export const isValidDeaceasedFatherAgeGap = (
  value: IFormFieldValue,
  drafts: IFormData
) => {
  return checkAgeGapInYears(drafts, 'father')
}

export const validateForeignRegAndGrantDate: Validation = (
  value: IFormFieldValue,
  drafts
) => {
  if (dateFormatRegex.test(value)) {
    if (new Date(value) > new Date(Date.now())) {
      return { message: messages.isFutureDate }
    }
    if (
      drafts.child?.childBirthDate &&
      dateFormatRegex.test(drafts.child?.childBirthDate)
    ) {
      if (new Date(value) < new Date(drafts.child.childBirthDate)) {
        return {
          message: messages.isBeforeChildBirthDate
        }
      }
    }
    if (
      drafts.deathEvent?.deathDate &&
      dateFormatRegex.test(drafts.deathEvent?.deathDate)
    ) {
      if (new Date(value) < new Date(drafts.deathEvent.deathDate)) {
        return {
          message: messages.isBeforeDeceasedDeathDate
        }
      }
    }
  }
  return undefined
}
