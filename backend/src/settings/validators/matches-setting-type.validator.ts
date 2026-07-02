import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { SettingType } from '@prisma/client';

@ValidatorConstraint({ name: 'MatchesSettingType', async: false })
export class MatchesSettingTypeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const type = object.type as SettingType | undefined;

    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    switch (type) {
      case SettingType.STRING:
        return true;
      case SettingType.NUMBER:
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          return false;
        }
        return !Number.isNaN(Number(value));
      case SettingType.BOOLEAN:
        return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
      case SettingType.JSON:
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as Record<string, unknown>;
    const type = object.type as SettingType | undefined;
    return `value is not a valid ${type ?? 'unknown'} representation`;
  }
}

export function MatchesSettingType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: MatchesSettingTypeConstraint,
    });
  };
}
