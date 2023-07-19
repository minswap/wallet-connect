export type Lib = typeof import('@emurgo/cardano-serialization-lib-browser');

// Node env not supported
class Module {
  private _wasm: Lib | null = null;

  get get(): Lib {
    if (this._wasm === null) {
      throw new Error('RustModule has not been loaded');
    }
    return this._wasm;
  }

  async load(): Promise<void> {
    if (this._wasm !== null) {
      return;
    }

    this._wasm = await import('@emurgo/cardano-serialization-lib-browser');
  }
}

const RustModule: Module = new Module();

export const loadCSL = async (): Promise<Lib> => {
  await RustModule.load();
  return RustModule.get;
};
