from django import forms

from .models import Profile


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "phone_number",
            "department",
            "faculty",
            "budget_min",
            "budget_max",
            "preferred_neighborhoods",
            "move_in_date",
            "smoker",
            "pets",
            "sleep_schedule",
            "cleanliness_level",
            "lifestyle_notes",
            "profile_photo_url",

        ]
        widgets = {
            "move_in_date": forms.DateInput(attrs={"type": "date"}),
            "lifestyle_notes": forms.Textarea(attrs={"rows": 4}),
            "preferred_neighborhoods": forms.Textarea(attrs={"rows": 2}),

        }
