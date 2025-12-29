from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("kustay", "0006_message_attachment_message_attachment_original_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="blockreview",
            name="is_approved",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="blockreview",
            name="moderation_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
