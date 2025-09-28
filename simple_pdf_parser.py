#!/usr/bin/env python3
"""
Simple PDF metadata parser - just reads JSON from PDF keywords field
"""

import json
import PyPDF2
import sys
from pathlib import Path

def parse_pdf(pdf_path):
    """Extract JSON metadata from PDF keywords field"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf = PyPDF2.PdfReader(file)
            
            # Get document info
            if pdf.metadata:
                # Get keywords field which contains our JSON
                keywords = pdf.metadata.get('/Keywords', '')
                
                # Try to parse as JSON
                try:
                    metadata = json.loads(keywords)
                    return metadata
                except json.JSONDecodeError:
                    print("Keywords field doesn't contain valid JSON")
                    print(f"Keywords content: {keywords[:200]}...")
                    return None
            else:
                print("No metadata found in PDF")
                return None
                
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python simple_pdf_parser.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    print(f"Parsing: {pdf_path}")
    
    metadata = parse_pdf(pdf_path)
    
    if metadata:
        print("\nMetadata found!")
        print("-" * 50)
        
        # Basic info
        print(f"Title: {metadata.get('title', 'N/A')}")
        print(f"Generated: {metadata.get('generatedAt', 'N/A')}")
        
        # Student info
        student = metadata.get('student', {})
        print(f"\nStudent: {student.get('name', 'N/A')}")
        print(f"S-Number: {student.get('snumber', 'N/A')}")
        print(f"Date: {student.get('date', 'N/A')}")
        
        # Questions
        questions = metadata.get('questions', [])
        print(f"\nTotal Questions: {len(questions)}")
        print("-" * 50)
        
        for q in questions:
            print(f"\nQ{q['questionNumber']}: {q['questionText']}")
            
            if q.get('questionDescription'):
                print(f"Description: {q['questionDescription']}")
            
            # Show answer text
            answer = q.get('answerText', q.get('answerPreview', ''))
            if len(answer) > 200:
                print(f"Answer: {answer[:200]}...")
            else:
                print(f"Answer: {answer}")
            
            # Show attachments
            attachments = q.get('attachments', [])
            if attachments:
                print(f"Attachments ({len(attachments)}):")
                for att in attachments:
                    print(f"  - {att['type']}: {att['filename']}")
        
        # Option to save full metadata
        if '--save-json' in sys.argv:
            output_file = Path(pdf_path).stem + '_metadata.json'
            with open(output_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"\nFull metadata saved to: {output_file}")
    
    else:
        print("\nNo metadata found. Make sure the PDF was generated with the updated code.")

if __name__ == "__main__":
    main()