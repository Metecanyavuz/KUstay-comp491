from django import forms

from .models import Listing, Message, Profile


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


class ListingForm(forms.ModelForm):
    amenities = forms.JSONField(
        required=False,
        widget=forms.Textarea(
            attrs={
                "rows": 3,
                "placeholder": '["wifi", "parking"]',
            }
        ),
        help_text="Enter a JSON array of amenities, for example ['wifi', 'parking'].",
    )

    class Meta:
        model = Listing
        fields = [
            "title",
            "description",
            "listing_type",
            "address",
            "neighborhood",
            "latitude",
            "longitude",
            "rent_amount",
            "available_from",
            "room_type",
            "total_rooms",
            "available_rooms",
            "amenities",
            "house_rules",
            "is_active",
            "image",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 5}),
            "house_rules": forms.Textarea(attrs={"rows": 4}),
            "available_from": forms.DateInput(attrs={"type": "date"}),
        }

    def clean(self):
        cleaned_data = super().clean()
        total = cleaned_data.get("total_rooms")
        available = cleaned_data.get("available_rooms")
        if (
            total is not None
            and available is not None
            and available > total
        ):
            self.add_error(
                "available_rooms",
                "Available rooms cannot exceed total rooms.",
            )
        return cleaned_data


class MessageForm(forms.ModelForm):
    class Meta:
        model = Message
        fields = ["message_text"]
        widgets = {
            "message_text": forms.Textarea(
                attrs={
                    "rows": 3,
                    "placeholder": "Write your message…",
                }
            )
        }
