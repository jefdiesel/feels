fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build_bundle

```sh
[bundle exec] fastlane android build_bundle
```

Build release AAB only (no upload)

### android upload_internal

```sh
[bundle exec] fastlane android upload_internal
```

Upload existing AAB to Play Store internal testing

### android upload_listing

```sh
[bundle exec] fastlane android upload_listing
```

Upload metadata, images, and screenshots only (no AAB)

### android ship

```sh
[bundle exec] fastlane android ship
```

Full release: build AAB + upload everything (metadata, images, screenshots, changelog)

### android beta

```sh
[bundle exec] fastlane android beta
```

Build and push to Play Store internal testing

### android promote_to_alpha

```sh
[bundle exec] fastlane android promote_to_alpha
```

Promote internal track to closed testing (alpha)

### android promote_to_production

```sh
[bundle exec] fastlane android promote_to_production
```

Promote alpha to production

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
