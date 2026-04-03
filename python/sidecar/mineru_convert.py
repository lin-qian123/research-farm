import argparse
import io
import os
import shutil
import time
import zipfile
from pathlib import Path

import requests


BASE_URL = "https://mineru.net/api/v4"


class MinerUConverter:
    def __init__(self, api_key: str):
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def process_file(self, file_path: str, output_root: str) -> Path:
        source = Path(file_path)
        if not source.exists():
            raise FileNotFoundError(f"File not found: {source}")

        file_info = {"name": source.name, "size": source.stat().st_size}
        init_resp = requests.post(
            f"{BASE_URL}/file-urls/batch",
            json={"files": [file_info]},
            headers=self.headers,
            timeout=60,
        )
        init_resp.raise_for_status()
        payload = init_resp.json()
        if payload.get("code") != 0:
            raise RuntimeError(f"MinerU init failed: {payload.get('msg')}")

        batch_id = payload["data"]["batch_id"]
        upload_url = payload["data"]["file_urls"][0]

        with source.open("rb") as handle:
            upload_resp = requests.put(upload_url, data=handle, timeout=300)
            upload_resp.raise_for_status()

        archive_url = self._poll_until_done(batch_id)
        return self._download_and_extract(archive_url, Path(output_root), source.stem)

    def _poll_until_done(self, batch_id: str) -> str:
        poll_url = f"{BASE_URL}/extract-results/batch/{batch_id}"
        while True:
          resp = requests.get(poll_url, headers=self.headers, timeout=60)
          resp.raise_for_status()
          payload = resp.json()
          if payload.get("code") != 0:
              raise RuntimeError(f"MinerU poll failed: {payload.get('msg')}")

          results = payload.get("data", {}).get("extract_result", [])
          if not results:
              time.sleep(2)
              continue

          result = results[0]
          state = result.get("state")
          if state == "done":
              return result["full_zip_url"]
          if state in {"error", "failed", "cancelled"}:
              raise RuntimeError(f"MinerU conversion failed with state={state}: {result.get('err_msg')}")
          time.sleep(3)

    def _download_and_extract(self, archive_url: str, output_root: Path, stem_name: str) -> Path:
        output_root.mkdir(parents=True, exist_ok=True)
        target_dir = output_root / stem_name
        target_dir.mkdir(parents=True, exist_ok=True)

        archive_resp = requests.get(archive_url, timeout=300)
        archive_resp.raise_for_status()

        with zipfile.ZipFile(io.BytesIO(archive_resp.content)) as bundle:
            bundle.extractall(target_dir)

        self._rename_primary_markdown(target_dir, stem_name)
        self._prune_directory(target_dir)
        return target_dir

    def _rename_primary_markdown(self, target_dir: Path, stem_name: str) -> None:
        target_path = target_dir / f"{stem_name}.md"
        if target_path.exists():
            return
        candidates = sorted(target_dir.glob("*.md"))
        if not candidates:
            return
        candidates[0].rename(target_path)

    def _prune_directory(self, target_dir: Path) -> None:
        for child in target_dir.iterdir():
            keep = child.is_dir() and child.name == "images"
            keep = keep or (child.is_file() and child.suffix.lower() in {".md", ".json"})
            if keep:
                continue
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a PDF into a MinerU Markdown bundle")
    parser.add_argument("filepath", help="Path to the PDF file")
    parser.add_argument("--output", "-o", default="./data/bundles", help="Output root directory")
    args = parser.parse_args()

    api_key = os.getenv("MINERU_API_KEY")
    if not api_key:
        raise RuntimeError("MINERU_API_KEY is not set")

    converter = MinerUConverter(api_key)
    target_dir = converter.process_file(args.filepath, args.output)
    print(target_dir)


if __name__ == "__main__":
    main()
