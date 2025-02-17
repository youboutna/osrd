# Generated by Django 4.1.5 on 2023-03-09 14:14

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("osrd_infra", "0014_remove_project_image_project_image_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="project",
            name="budget",
            field=models.IntegerField(blank=True, default=0),
        ),
        migrations.AlterField(
            model_name="project",
            name="funders",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="project",
            name="tags",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(max_length=255), blank=True, default=[], size=None
            ),
        ),
    ]
