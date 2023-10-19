/// <reference path="./wx/index.d.ts" />
/// <reference path="api.d.ts" />

type MaybePromise<T> = Promise<T> | T

type Theme = 'light' | 'dark'

type Listener<T> = (value: T) => void
