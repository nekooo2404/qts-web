export class LastActiveAdministratorError extends Error {
  constructor() {
    super('At least one active administrator must retain user and role management permissions');
    this.name = 'LastActiveAdministratorError';
  }
}
