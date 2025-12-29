from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("kustay", "0007_block_review_moderation"),
    ]

    operations = [
        migrations.AddField(
            model_name="blockreview",
            name="unit_details",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
