export class ProviderNotInitialisedError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ProviderNotInitialisedError.prototype);
  }
}

export class EnabledApiNotFoundError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, EnabledApiNotFoundError.prototype);
  }
}

export class DefaultChainNotSetError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DefaultChainNotSetError.prototype);
  }
}

export class AccountNotSetError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AccountNotSetError.prototype);
  }
}

export class ConnectionAbortedByUserError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ConnectionAbortedByUserError.prototype);
  }
}

export class Web3ModalInitError extends Error {
  error: unknown;

  constructor(errorMsg: string) {
    // 'Error' breaks prototype chain here
    super(errorMsg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, Web3ModalInitError.prototype);
  }
}
