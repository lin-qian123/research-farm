# Python Sidecar

This directory hosts Python-native research helpers that should stay outside the Node runtime.

## Included Today

- `mineru_convert.py`: first-party PDF to Markdown conversion entrypoint for paper bundle generation.

## Expected Environment

- Python 3.11+
- `requests`
- `MINERU_API_KEY` set in the environment

## Contract

The converter should produce a directory under the requested output root and preserve the MinerU Markdown result plus extracted images. The Node ingest layer then normalizes that directory into the canonical bundle format by ensuring `paper.md` and generating JSON indexes.
