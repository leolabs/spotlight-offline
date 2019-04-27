export interface Icon {
  type?: "fileicon" | string;
  path?: string;
}

export interface Mod {
  valid?: boolean;
  arg?: string;
  subtitle: string;
  icon?: Icon;
}

export interface OutputItem {
  uid?: string;
  type?: "default" | "file" | "file:skipcheck";
  title: string;
  subtitle: string;
  arg?: string;
  autocomplete?: string;
  valid?: boolean;
  icon: Icon;
  quicklookurl?: string;

  mods?: {
    cmd?: Mod;
    alt?: Mod;
  };

  text?: {
    copy?: string;
    largetype?: string;
  };
}
