#!/usr/bin/env python3
"""
Proper PDF metadata parser for University of Twente assignments
Reads metadata from PDF structure, not from visible text
"""

import json
import base64
import re
from pathlib import Path
from typing import Dict, Optional
import PyPDF2

# For more advanced PDF parsing
try:
    import pikepdf
    HAS_PIKEPDF = True
except ImportError:
    HAS_PIKEPDF = False
    print("For better PDF metadata extraction, install pikepdf: pip install pikepdf")

# For reading PDF attachments
try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
    print("For attachment extraction, install PyMuPDF: pip install PyMuPDF")


class ProperPDFParser:
    """Extract metadata from PDF structure, not visible text"""
    
    def parse_pdf(self, pdf_path: str) -> Optional[Dict]:
        """Try multiple methods to extract metadata"""
        
        print(f"\nParsing PDF: {pdf_path}")
        
        # Method 1: Check document info/properties
        metadata = self.extract_from_properties(pdf_path)
        if metadata:
            return metadata
        
        # Method 2: Check for file attachments
        if HAS_FITZ:
            metadata = self.extract_from_attachments_mupdf(pdf_path)
            if metadata:
                return metadata
        
        # Method 3: Check PDF structure with pikepdf
        if HAS_PIKEPDF:
            metadata = self.extract_with_pikepdf(pdf_path)
            if metadata:
                return metadata
        
        # Method 4: Look for annotations
        metadata = self.extract_from_annotations(pdf_path)
        if metadata:
            return metadata
        
        # Method 5: Check for data URLs in the PDF
        metadata = self.extract_from_data_urls(pdf_path)
        if metadata:
            return metadata
        
        print("Could not find metadata in PDF structure")
        return None
    
    def extract_from_properties(self, pdf_path: str) -> Optional[Dict]:
        """Extract basic info from PDF document properties"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf = PyPDF2.PdfReader(file)
                
                if pdf.metadata:
                    print("Found document properties:")
                    
                    # Check if full metadata might be in keywords
                    keywords = pdf.metadata.get('/Keywords', '')
                    if 'UT-Assignment' in keywords:
                        print("  - Found UT-Assignment marker in keywords")
                        
                        # Try to reconstruct basic metadata from properties
                        metadata = {
                            'title': pdf.metadata.get('/Title', ''),
                            'student': {
                                'name': pdf.metadata.get('/Author', ''),
                            },
                            'extracted_from': 'document_properties'
                        }
                        
                        # Parse keywords for additional info
                        for kw in keywords.split(','):
                            if ':' in kw:
                                key, value = kw.split(':', 1)
                                if key == 'student':
                                    metadata['student']['snumber'] = value
                                elif key == 'date':
                                    metadata['student']['date'] = value
                        
                        return metadata
        except Exception as e:
            print(f"Error reading properties: {e}")
        
        return None
    
    def extract_from_attachments_mupdf(self, pdf_path: str) -> Optional[Dict]:
        """Extract from PDF attachments using PyMuPDF"""
        try:
            import fitz
            doc = fitz.open(pdf_path)
            
            # Check for embedded files
            embedded_files = doc.embfile_names()
            if embedded_files:
                print(f"Found {len(embedded_files)} embedded files")
                
                for filename in embedded_files:
                    if 'metadata' in filename.lower() or filename.endswith('.json'):
                        print(f"  - Extracting: {filename}")
                        
                        # Get the embedded file content
                        content = doc.embfile_get(filename)
                        
                        try:
                            # Try to parse as JSON
                            metadata = json.loads(content)
                            metadata['extracted_from'] = 'embedded_file'
                            metadata['filename'] = filename
                            return metadata
                        except:
                            # Might be base64 encoded
                            try:
                                decoded = base64.b64decode(content)
                                metadata = json.loads(decoded)
                                metadata['extracted_from'] = 'embedded_file_base64'
                                return metadata
                            except:
                                pass
            
            doc.close()
        except Exception as e:
            print(f"Error with PyMuPDF: {e}")
        
        return None
    
    def extract_with_pikepdf(self, pdf_path: str) -> Optional[Dict]:
        """Use pikepdf for low-level PDF structure access"""
        try:
            import pikepdf
            
            with pikepdf.open(pdf_path) as pdf:
                # Check for custom metadata streams
                root = pdf.root
                
                # Look for metadata in catalog
                if hasattr(root, 'Metadata'):
                    print("Found metadata stream in catalog")
                    metadata_stream = root.Metadata
                    
                    try:
                        # Read the stream
                        data = metadata_stream.read_bytes()
                        # Could be JSON or XML
                        try:
                            metadata = json.loads(data)
                            metadata['extracted_from'] = 'metadata_stream'
                            return metadata
                        except:
                            # Maybe it's base64
                            try:
                                decoded = base64.b64decode(data)
                                metadata = json.loads(decoded)
                                metadata['extracted_from'] = 'metadata_stream_base64'
                                return metadata
                            except:
                                pass
                    except Exception as e:
                        print(f"Error reading metadata stream: {e}")
                
                # Check page annotations
                for page_num, page in enumerate(pdf.pages):
                    if '/Annots' in page:
                        annots = page['/Annots']
                        for annot in annots:
                            annot_obj = annot.get_object()
                            
                            # Check if it's our metadata annotation
                            if '/Contents' in annot_obj:
                                contents = str(annot_obj['/Contents'])
                                if 'assignment-metadata' in contents:
                                    print(f"Found metadata annotation on page {page_num + 1}")
                                    
                                    # Extract JSON from contents
                                    try:
                                        # Find JSON in the contents
                                        json_match = re.search(r'\{.*\}', contents, re.DOTALL)
                                        if json_match:
                                            metadata = json.loads(json_match.group())
                                            if 'data' in metadata:
                                                return metadata['data']
                                            return metadata
                                    except:
                                        pass
                
        except Exception as e:
            print(f"Error with pikepdf: {e}")
        
        return None
    
    def extract_from_annotations(self, pdf_path: str) -> Optional[Dict]:
        """Extract from PDF annotations using PyPDF2"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf.pages):
                    if '/Annots' in page:
                        annotations = page['/Annots']
                        
                        for annot_ref in annotations:
                            annotation = annot_ref.get_object()
                            
                            # Check for metadata in annotation
                            if '/Contents' in annotation:
                                contents = annotation['/Contents']
                                if 'metadata' in str(contents).lower():
                                    print(f"Found potential metadata annotation on page {page_num + 1}")
                                    
                                    # Try to extract data URL
                                    url_match = re.search(r'data:application/json;base64,([A-Za-z0-9+/=]+)', str(contents))
                                    if url_match:
                                        try:
                                            base64_data = url_match.group(1)
                                            json_data = base64.b64decode(base64_data).decode('utf-8')
                                            metadata = json.loads(json_data)
                                            metadata['extracted_from'] = 'annotation_data_url'
                                            return metadata
                                        except:
                                            pass
        
        except Exception as e:
            print(f"Error reading annotations: {e}")
        
        return None
    
    def extract_from_data_urls(self, pdf_path: str) -> Optional[Dict]:
        """Look for data URLs in PDF content"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_content = file.read()
                
                # Look for data URLs in the binary content
                pattern = rb'data:application/json;base64,([A-Za-z0-9+/=]+)'
                matches = re.findall(pattern, pdf_content)
                
                if matches:
                    print(f"Found {len(matches)} data URLs in PDF")
                    
                    for match in matches:
                        try:
                            json_data = base64.b64decode(match).decode('utf-8')
                            metadata = json.loads(json_data)
                            
                            # Check if it's our metadata
                            if 'generatedAt' in metadata or 'student' in metadata:
                                metadata['extracted_from'] = 'data_url_in_pdf'
                                return metadata
                        except:
                            continue
        
        except Exception as e:
            print(f"Error searching for data URLs: {e}")
        
        return None
    
    def generate_report(self, metadata: Dict) -> str:
        """Generate a report from extracted metadata"""
        report = []
        report.append("\n" + "=" * 60)
        report.append("EXTRACTED METADATA REPORT")
        report.append("=" * 60)
        report.append(f"Extraction method: {metadata.get('extracted_from', 'unknown')}")
        
        if 'title' in metadata:
            report.append(f"Title: {metadata['title']}")
        
        if 'student' in metadata:
            student = metadata['student']
            report.append(f"\nStudent Information:")
            for key, value in student.items():
                report.append(f"  {key}: {value}")
        
        if 'questions' in metadata:
            report.append(f"\nQuestions: {len(metadata['questions'])}")
            for q in metadata['questions'][:3]:  # Show first 3
                report.append(f"  Q{q.get('questionNumber', '?')}: {q.get('questionText', 'N/A')[:50]}...")
        
        return "\n".join(report)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Extract metadata from PDF structure (not visible text)"
    )
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("--json-output", help="Save metadata to JSON file")
    parser.add_argument("--report", action="store_true", help="Generate report")
    
    args = parser.parse_args()
    
    # Parse PDF
    pdf_parser = ProperPDFParser()
    metadata = pdf_parser.parse_pdf(args.pdf_path)
    
    if metadata:
        if args.json_output:
            with open(args.json_output, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"\nMetadata saved to: {args.json_output}")
        
        if args.report:
            print(pdf_parser.generate_report(metadata))
        else:
            print("\nExtracted metadata successfully!")
            print(f"Title: {metadata.get('title', 'N/A')}")
    else:
        print("\nFailed to extract metadata")
        print("Make sure the PDF was generated with the updated code")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())