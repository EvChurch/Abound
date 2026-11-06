# Dependency repair acceptance

Phase: plan, then work and standard review.

Preserve the UV 0.13 digest and supported Python 3.13 selection. Repository setup uses only standard-library Python plus UV-managed ast-grep, not pip. Remove unused pip with UV's typed uninstall command from only the disposable managed interpreter; remove the complete optional ensurepip bootstrap module (including its bundled wheel), not vendored source fragments. Keep OS Python untouched. Document that `python -m venv` users must use UV or `--without-pip`. Validate full exact-source images, imports, ast-grep, isolated virtual environments, synthetic loopback HTTP, full runtime audits, and repository native gates against current main. No external application data or APIs.

Verification must preserve Python 3.13, standard-library post_install imports and ast-grep. `ensurepip` is intentionally unavailable, a deliberate documented departure from PEP 453 distributor recommendations; use `uv venv` and `uv pip install`, or `python -m venv --without-pip`. This image deliberately removes the complete unused bootstrap package, not security-related lines within it. UV's explicit build-only managed-install override is confined to this interpreter; the externally-managed marker remains. See https://docs.astral.sh/uv/reference/cli/#uv-pip-uninstall and https://docs.python.org/3.13/library/ensurepip.html.
