# License review

Reviewed against upstream primary tagged source and cached executable on October 4, 2026. Upstream pin 0.23.4; template contract 1.0.1. This release distributes original source and build instructions, not an assembled binary image.

The pinned Readeck source headers and REUSE.toml identify AGPL-3.0-only; the root LICENSE contains the AGPLv3 text. Individual files/dependencies and Node/Alpine components have their own licenses. Do not copy website prose/artwork under assumed software terms: website content is separately licensed and the marketplace icon is linked as the product identifier, not relabeled as AGPL artwork. Preserve notices/corresponding source and network-use obligations for modifications; template authorship does not imply vendor endorsement.

## Primary sources

- https://codeberg.org/readeck/readeck/src/tag/0.23.4/LICENSE
- https://codeberg.org/readeck/readeck/src/tag/0.23.4/REUSE.toml
- https://codeberg.org/readeck/readeck/src/tag/0.23.4/configs/configs.go
- https://readeck.org/en/docs/configuration
- https://readeck.org/en/docs/deploy
- https://readeck.org/en/docs/backups

The template references immutable upstream images rather than vendoring/relicensing the complete application. The pinned Readeck executable is copied without modification; the original MIT guards communicate through ordinary HTTP, proxy and CLI protocols. On these reviewed facts, no modification of the covered Readeck program or new mandatory AGPL section 13 source offer is established. The upstream About source/license links remain intact. Any future covered-program modification requires reassessment and a prominent offer of that actual modified version's corresponding source to remote users.

The image retains the tagged Readeck repository archive and its AGPL text, the inherited Node aggregate notice, and the original recipe MIT license at `/opt/template/LICENSE`. The archive hash proves its identity, NOT complete corresponding-source delivery for an assembled image. The inspected upstream amd64 executable is statically linked, records CGO/external static linking and contains glibc-specific code; Alpine's musl license is not a substitute for that linked libc's obligations. Exact library/toolchain source, required dependency/build inputs, LGPL notice and source/relinking delivery must be established separately before conveying an assembled image. This repository does not publish one or claim that binary-distribution review is complete.

Within a finite source-recipe permission and default-exposure review, no concrete missing source grant or default-reachable unpatched advisory trigger was identified. This is not a zero-CVE, universal image-security or legal certification. Node's pinned cached runtime is 24.21.0, not another template's runtime. Product identifiers confer no trademark ownership or vendor endorsement; website artwork/prose is not relabeled under the software license. Authoring-only railway npm 3.6.0 is not a runtime dependency.

## Default logging boundary

Upstream INFO request logs include request URLs. Optional share/recovery capability URLs can therefore appear in logs: restrict log access and retention as sensitive data. Client-supplied `X-Forwarded-For` is forwarded and must not be treated as verified audit attribution or an authorization boundary. No default authorization decision on that address was identified. Authentication headers/bodies are not emitted by the reviewed default INFO logger; extremely verbose crawler logging is outside the default contract.

## Recipe ownership authorization — October 2, 2026

The owner explicitly approved MIT licensing for newly authored recipe, wrapper and application code. `LICENSE` applies only to that original code. It does not relicense upstream software, dependencies, fonts or trademarks. Upstream notices, copyleft corresponding-source delivery and network-use obligations remain independently applicable.
