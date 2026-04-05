import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAP_KEY = 'skipResponseWrap';

/** Skip global TransformInterceptor wrapping (e.g. raw CSV/JSON file downloads). */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP_KEY, true);
