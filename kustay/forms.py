from django import forms

from .models import Profile


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            "budget_min",
            "budget_max",
            "move_in_date",
            "smoker",
            "pets",
            "sleep_schedule",
            "cleanliness_level",
            "lifestyle_notes",
        ]
        widgets = {
            "move_in_date": forms.DateInput(attrs={"type": "date"}),
            "lifestyle_notes": forms.Textarea(attrs={"rows": 3}),
        }
