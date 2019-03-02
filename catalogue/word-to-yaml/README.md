# Ferenc Farkas Catalog Word to YAML transformer

This is a one-time running Work to YAML transformer, used as a starting point
to using YAML files for managing the catalog of works instead of a single Word
file.

⚠️ **It is not intended to be re-used after the initial satisfying release of
the YAML-based catalog.**

## Preliminary manual operations for successful transformation
1. Open original Windows Word document (.doc) on Word mac
2. Click on File > Convert Document => creates a new .docx document
3. Save document as "Web page, filtered"
4. Open the exported HTML document in VSCode with the Windows CP-1252 encoding
5. Merge all table that are is not a sibling of an H1 tag with its preceding table
6. Also ensure h1 sibling tables are not wrapped in divs. In the 2018 verison around line 55000, the table sibling h1 "Voice and other instrument(x) orchestra" is wrapped in a `<div align=center>` tag.