import {MicxCdnImageObserver} from "./mediastore/MicxCdnImageObserver";

export const MicxlibRev = "1.0.7";

export * from './Micx';
export * from './formmail/MicxFormmailerApi';
export * from './formmail/MicxFormmailStyleInterface';
export * from './formmail/MicxFormmailFacade';
export * from './formmail/MicxFormmailDefaultBootstrapStyle';


export * from './mediastore/MicxCdnImageObserver';




let o = new MicxCdnImageObserver();
o.observe();
