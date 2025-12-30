from django import forms

from .models import Listing, Message, Profile, Report, BlockedUser, BlockReview


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "phone_number",
            "departments",
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
        fields = ["message_text", "attachment"]
        widgets = {
            "message_text": forms.Textarea(
                attrs={
                    "rows": 3,
                    "placeholder": "Write your message…",
                }
            )
        }

    def clean(self):
        cleaned_data = super().clean()
        text = (cleaned_data.get("message_text") or "").strip()
        attachment = cleaned_data.get("attachment")
        if not text and not attachment:
            raise forms.ValidationError("Please enter a message or attach a file.")
        cleaned_data["message_text"] = text
        return cleaned_data


class ReportForm(forms.ModelForm):
    class Meta:
        model = Report
        fields = ["report_type", "description"]
        widgets = {
            "description": forms.Textarea(
                attrs={
                    "rows": 5,
                    "placeholder": "Please describe the issue in detail...",
                }
            ),
            "report_type": forms.Select(
                attrs={
                    "class": "form-select",
                }
            ),
        }
        labels = {
            "report_type": "Report Type",
            "description": "Description",
        }
        help_texts = {
            "description": "Provide as much detail as possible to help us understand the issue.",
        }

    def clean_description(self):
        description = self.cleaned_data.get("description", "").strip()
        if len(description) < 10:
            raise forms.ValidationError(
                "Description must be at least 10 characters long."
            )
        if len(description) > 1000:
            raise forms.ValidationError(
                "Description cannot exceed 1000 characters."
            )
        return description


class BlockReviewForm(forms.ModelForm):
    class Meta:
        model = BlockReview
        fields = [
            "block_name",
            "neighborhood",
            "unit_details",
            "noise_rating",
            "management_rating",
            "safety_rating",
            "transport_rating",
            "comment",
        ]
        widgets = {
            "block_name": forms.TextInput(
                attrs={
                    "placeholder": "e.g., Seba Sitesi",
                    "class": "form-control",
                }
            ),
            "neighborhood": forms.TextInput(
                attrs={
                    "placeholder": "e.g., Sarıyer",
                    "class": "form-control",
                }
            ),
            "unit_details": forms.TextInput(
                attrs={
                    "placeholder": "e.g., Block A, Floor 3 (Optional)",
                    "class": "form-control",
                }
            ),
            "noise_rating": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 5,
                    "class": "form-control",
                }
            ),
            "management_rating": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 5,
                    "class": "form-control",
                }
            ),
            "safety_rating": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 5,
                    "class": "form-control",
                }
            ),
            "transport_rating": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 5,
                    "class": "form-control",
                }
            ),
            "comment": forms.Textarea(
                attrs={
                    "rows": 4,
                    "maxlength": 300,
                    "placeholder": "Share your experience (max 300 characters)...",
                    "class": "form-control",
                }
            ),
        }
        labels = {
            "block_name": "Block/Site Name",
            "neighborhood": "Neighborhood",
            "unit_details": "Unit Details (Optional)",
            "noise_rating": "Noise Level (1-5)",
            "management_rating": "Management Quality (1-5)",
            "safety_rating": "Safety (1-5)",
            "transport_rating": "Transportation Access (1-5)",
            "comment": "Additional Comments",
        }
        help_texts = {
            "noise_rating": "1 = Very Quiet, 5 = Very Noisy",
            "management_rating": "1 = Poor, 5 = Excellent",
            "safety_rating": "1 = Unsafe, 5 = Very Safe",
            "transport_rating": "1 = Poor Access, 5 = Excellent Access",
            "comment": "Optional: Share additional details about your experience.",
        }

    def clean(self):
        cleaned_data = super().clean()
        ratings = [
            "noise_rating",
            "management_rating",
            "safety_rating",
            "transport_rating",
        ]
        for rating_field in ratings:
            rating = cleaned_data.get(rating_field)
            if rating is not None and (rating < 1 or rating > 5):
                self.add_error(
                    rating_field,
                    "Rating must be between 1 and 5.",
                )

        comment = cleaned_data.get("comment", "").strip()
        if len(comment) > 300:
            self.add_error(
                "comment",
                "Comment cannot exceed 300 characters.",
            )

        return cleaned_data
