#!/usr/bin/env python
import os
import sys
import argparse
import pathspec  # pip install pathspec

# Define ignore patterns; added .github/ and tsconfig.tsbuildinfo.
IGNORE_PATTERNS = r"""
# JSON Keys
key

# Git related
.git/
.git/**
.gitignore
.gitmodules
.gitattributes

cache

# Minified files
.min.
*/.min.*
*/.min.
.svg

# Environment files
.env
.env.*
*.env
.venv

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# IDE - IntelliJ
.idea/
*.iml
*.iws
*.ipr
.idea_modules/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
venv/
ENV/

# Node
node_modules/

# Package Managers
package-lock.json
yarn.lock
pnpm-lock.yaml
.pnpm-store/
package.json

# Next.js
.next
out/
.vercel/
next-env.d.ts
.next-env.d.ts
build/
.turbo
storybook-static/

# Ruby
*.gem
*.rbc
/.config
/coverage/
/InstalledFiles
/pkg/
/spec/reports/
/test/tmp/
/test/version_tmp/
/tmp/
.rake_tasks

# Java
*.class
*.log
*.jar
*.war
*.nar
*.ear
*.zip
*.tar.gz
*.rar
target/
.mvn/

# Swift/Xcode
*.xcodeproj/
*.xcworkspace/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.moved-aside
*.xccheckout
*.xcscmblueprint
*.hmap
*.ipa
*.dSYM.zip
*.dSYM

# Gradle
.gradle
/build/
gradle-app.setting
!gradle-wrapper.jar
.gradletasknamecache

# C/C++
*.d
*.o
*.ko
*.obj
*.elf
*.ilk
*.map
*.exp
*.gch
*.pch
*.lib
*.a
*.la
*.lo
*.dll
*.so
.so.
*.dylib
*.exe
*.out
*.app

# Logs and databases
*.log
*.sql
*.sqlite

# Binary/Media files
*.png
*.jpg
*.jpeg
*.gif
*.bmp
*.ico
*.mov
*.mp4
*.mp3
*.flv
*.fla
*.swf
*.gz
*.zip
*.7z
*.ttf
*.eot
*.woff
*.woff2
*.pdf

# Bundle files
*.bundle.js
*.bundle.css
*-bundle.js
*-bundle.css
*-compressed.js
*-compressed.css
*.pack.js
*.pack.css

# Other folders/files to ignore
.github/
tsconfig.tsbuildinfo
next-env.d.ts
*.wiki
.pem
"""

class CodeBaseCollector:
    def __init__(self):
        # Process ignore patterns into a PathSpec instance.
        pattern_lines = [line.strip() for line in IGNORE_PATTERNS.splitlines() 
                         if line.strip() and not line.strip().startswith('#')]
        self.ignore_spec = pathspec.PathSpec.from_lines('gitwildmatch', pattern_lines)
        self.script_path = os.path.realpath(__file__)

    def should_ignore(self, relative_path: str) -> bool:
        """
        Returns True if the given relative path should be ignored.
        The check is done in POSIX style and also with a trailing slash for directories.
        """
        posix_path = relative_path.replace(os.sep, '/')
        if self.ignore_spec.match_file(posix_path):
            return True
        if not posix_path.endswith('/') and self.ignore_spec.match_file(posix_path + '/'):
            return True
        return False

    def process_files(self, start_path: str = '.', output_filename: str = None) -> list:
        """
        Recursively traverses start_path and collects each file's content (with markers)
        into a list of blocks. Additionally, compress the content by removing extra whitespace.
        Files/folders matching ignore patterns, as well as the script file and the designated
        output file, are skipped.
        """
        blocks = []
        output_abs = os.path.realpath(output_filename) if output_filename else None

        for root, dirs, files in os.walk(start_path):
            rel_dir = os.path.relpath(root, start_path)
            rel_dir_posix = rel_dir.replace(os.sep, '/')
            if rel_dir != '.' and self.should_ignore(rel_dir_posix):
                dirs[:] = []
                continue

            dirs[:] = [d for d in dirs 
                       if not self.should_ignore(os.path.join(rel_dir, d).replace(os.sep, '/'))]

            for file in files:
                rel_file = os.path.join(rel_dir, file) if rel_dir != '.' else file
                file_path = os.path.join(root, file)
                file_real = os.path.realpath(file_path)
                if output_abs and file_real == output_abs:
                    continue
                if file_real == self.script_path:
                    continue
                if self.should_ignore(rel_file):
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    # Remove all extra whitespace (compress the content)
                    compressed_content = " ".join(content.split())
                    block = (f"<<<<<<<<<< START OF FILE: {rel_file} >>>>>>>>>>\n"
                             f"{compressed_content}\n"
                             f"<<<<<<<<<< END OF FILE: {rel_file} >>>>>>>>>>\n")
                    blocks.append(block)
                except UnicodeDecodeError:
                    blocks.append(f"<<<<<<<<<< FAILED TO READ FILE: {rel_file} (encoding error) >>>>>>>>>>\n")
                except Exception as e:
                    blocks.append(f"<<<<<<<<<< ERROR READING FILE: {rel_file} ({str(e)}) >>>>>>>>>>\n")
        return blocks

    def write_to_file(self, content: str, output_file: str):
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Written: {output_file}")
        except Exception as e:
            print(f"Failed to write to {output_file}: {e}")

    def main(self):
        parser = argparse.ArgumentParser(
            description='Collect the code base into two text files (split in half) with minimal spacing.'
        )
        parser.add_argument('--path', '-p', default='.', help='Starting path (default: current directory)')
        parser.add_argument('--output1', '-o1', default='project_code_part1.txt', help='First output file name')
        parser.add_argument('--output2', '-o2', default='project_code_part2.txt', help='Second output file name')
        args = parser.parse_args()

        blocks = self.process_files(args.path, output_filename=args.output1)
        total_files = len(blocks)
        if total_files == 0:
            print("No files processed.")
            return

        split_index = total_files // 2
        # Join blocks with a single newline.
        part1 = "\n".join(blocks[:split_index])
        part2 = "\n".join(blocks[split_index:])

        self.write_to_file(part1, args.output1)
        self.write_to_file(part2, args.output2)

if __name__ == '__main__':
    collector = CodeBaseCollector()
    collector.main()
