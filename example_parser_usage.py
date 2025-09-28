#!/usr/bin/env python3
"""
Example usage of the Assignment PDF Parser
Shows various ways to process assignment PDFs
"""

from pdf_parser import AssignmentPDFParser
from pathlib import Path
import json

def example_basic_parsing():
    """Basic parsing example"""
    parser = AssignmentPDFParser()
    
    # Parse a PDF
    metadata = parser.parse_pdf("assignment_submission_s1234567_2024-01-15.pdf")
    
    if metadata:
        print(f"Assignment: {metadata['title']}")
        print(f"Student: {metadata['student']['name']}")
        print(f"Number of questions: {metadata['questionCount']}")
        
        # Process each question
        for q in metadata['questions']:
            print(f"\nQ{q['questionNumber']}: {q['questionText']}")
            print(f"Answer length: {len(q['answerPlainText'])} characters")


def example_with_validation():
    """Example with JSON schema validation"""
    parser = AssignmentPDFParser(schema_path="metadata_schema.json")
    
    metadata = parser.parse_pdf("assignment.pdf")
    # If validation fails, an error will be printed


def example_extract_images():
    """Example extracting all images from the PDF"""
    parser = AssignmentPDFParser()
    
    metadata = parser.parse_pdf("assignment.pdf")
    if metadata:
        # Save all images to a directory
        parser.save_images(metadata, output_dir="student_images")


def example_batch_processing():
    """Process multiple PDFs in a directory"""
    parser = AssignmentPDFParser()
    results = []
    
    pdf_dir = Path("submissions")
    for pdf_file in pdf_dir.glob("*.pdf"):
        print(f"Processing {pdf_file.name}")
        metadata = parser.parse_pdf(str(pdf_file))
        
        if metadata:
            results.append({
                'filename': pdf_file.name,
                'student_name': metadata['student'].get('name', 'Unknown'),
                'student_number': metadata['student'].get('snumber', 'Unknown'),
                'questions_answered': len([
                    q for q in metadata['questions'] 
                    if q['answerPlainText'].strip()
                ]),
                'total_questions': metadata['questionCount']
            })
    
    # Save summary
    with open('batch_summary.json', 'w') as f:
        json.dump(results, f, indent=2)


def example_answer_analysis():
    """Analyze answer content"""
    parser = AssignmentPDFParser()
    metadata = parser.parse_pdf("assignment.pdf")
    
    if metadata:
        for q in metadata['questions']:
            # Word count
            word_count = len(q['answerPlainText'].split())
            
            # Check for images
            has_images = bool(q.get('uploadedImage')) or '<img' in q['answerHTML']
            
            # Check for formatted elements
            has_lists = '<ul>' in q['answerHTML'] or '<ol>' in q['answerHTML']
            has_code = '<code>' in q['answerHTML'] or '<pre>' in q['answerHTML']
            
            print(f"\nQuestion {q['questionNumber']} Analysis:")
            print(f"  - Word count: {word_count}")
            print(f"  - Has images: {has_images}")
            print(f"  - Has lists: {has_lists}")
            print(f"  - Has code blocks: {has_code}")


def example_create_grading_template():
    """Create a grading template from the metadata"""
    parser = AssignmentPDFParser()
    metadata = parser.parse_pdf("assignment.pdf")
    
    if metadata:
        grading_template = {
            'assignment': metadata['title'],
            'student': metadata['student'],
            'grades': []
        }
        
        for q in metadata['questions']:
            grading_template['grades'].append({
                'question_number': q['questionNumber'],
                'question_text': q['questionText'],
                'max_points': 10,  # Default
                'awarded_points': None,
                'feedback': ""
            })
        
        # Save template
        with open('grading_template.json', 'w') as f:
            json.dump(grading_template, f, indent=2)
        
        print("Grading template created: grading_template.json")


if __name__ == "__main__":
    print("Assignment PDF Parser Examples")
    print("=" * 40)
    
    # Run examples (comment out as needed)
    example_basic_parsing()
    # example_with_validation()
    # example_extract_images()
    # example_batch_processing()
    # example_answer_analysis()
    # example_create_grading_template()