from django.db import models


class OsrdSearchOperationalPoint(models.Model):
    class Meta:
        db_table = "osrd_search_operationalpoint"
        managed = False


class OsrdSearchTrack(models.Model):
    class Meta:
        db_table = "osrd_search_track"
        managed = False


class OsrdSearchSignal(models.Model):
    class Meta:
        db_table = "osrd_search_signal"
        managed = False
