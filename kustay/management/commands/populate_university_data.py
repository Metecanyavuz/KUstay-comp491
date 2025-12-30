from django.core.management.base import BaseCommand
from kustay.models import Faculty, Department

class Command(BaseCommand):
    help = 'Populates the database with Koç University Faculties and Departments'

    def handle(self, *args, **kwargs):
        data = {
            "College of Administrative Sciences and Economics (CASE)": [
                "Business Administration",
                "Economics",
                "International Relations"
            ],
            "College of Engineering (CE)": [
                "Computer Engineering",
                "Electrical-Electronics Engineering",
                "Industrial Engineering",
                "Mechanical Engineering",
                "Chemical and Biological Engineering"
            ],
            "College of Sciences (CS)": [
                "Physics",
                "Chemistry",
                "Mathematics",
                "Molecular Biology and Genetics"
            ],
            "College of Social Sciences and Humanities (CSSH)": [
                "Psychology",
                "Sociology",
                "History",
                "Philosophy",
                "Media and Visual Arts",
                "Archaeology and History of Art",
                "English Language and Comparative Literature"
            ],
            "Law School": [
                "Law"
            ],
            "School of Medicine": [
                "Medicine"
            ],
            "School of Nursing": [
                "Nursing"
            ]
        }

        self.stdout.write("Starting data population...")

        for faculty_name, departments in data.items():
            faculty, created = Faculty.objects.get_or_create(name=faculty_name)
            if created:
                self.stdout.write(f"Created Faculty: {faculty_name}")
            else:
                self.stdout.write(f"Faculty already exists: {faculty_name}")

            for dept_name in departments:
                department, created = Department.objects.get_or_create(name=dept_name, faculty=faculty)
                if created:
                    self.stdout.write(f"  - Created Department: {dept_name}")
        
        self.stdout.write(self.style.SUCCESS("Successfully populated university data."))
