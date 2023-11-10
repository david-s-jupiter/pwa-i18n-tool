## Usage:

### Convert locales json to xlsx sheet:

Full Data:

```
$ npm run json-to-sheet <relative_path_to_locales_dir>
```

Only diff between two commits:

```
$ npm run json-to-sheet <relative_path_to_locales_dir> <from_commit_sha> <to_commit_sha> [base_lang]
```

- base_lang is optional, defaults to 'en' when not passing in.

### Output:

i18n.xlsx inside pwa-i18n-tools dir.
