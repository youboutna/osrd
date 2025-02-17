# Generated by Django 4.1.5 on 2023-03-01 14:11

import osrd_schemas.rolling_stock
import osrd_schemas.train_schedule
from django.db import migrations, models

import osrd_infra.utils
from osrd_infra.migrations import change_railjson_version


class Migration(migrations.Migration):

    dependencies = [
        ("osrd_infra", "0011_document"),
    ]

    operations = [
        migrations.RenameField(
            model_name="rollingstock",
            old_name="power_class",
            new_name="base_power_class",
        ),
        migrations.AddField(
            model_name="rollingstock",
            name="power_restrictions",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Mapping from train's power restriction codes to power classes (optional)",
                validators=[osrd_infra.utils.PydanticValidator(osrd_schemas.rolling_stock.PowerRestrictions)],
            ),
        ),
        migrations.AddField(
            model_name="trainschedulemodel",
            name="power_restriction_ranges",
            field=models.JSONField(
                blank=True,
                null=True,
                validators=[osrd_infra.utils.PydanticValidator(osrd_schemas.train_schedule.PowerRestrictionRanges)],
            ),
        ),
        migrations.AlterField(
            model_name="rollingstock",
            name="version",
            field=models.CharField(default="3.1", editable=False, max_length=16),
        ),
        change_railjson_version("rollingstock", "3.0", "3.1"),
    ]
