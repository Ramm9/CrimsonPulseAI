import apps.telemetry.models
from django.db import migrations, models

def backfill_event_ids(apps, schema_editor):
    TelemetryEvent = apps.get_model('telemetry', 'TelemetryEvent')
    for event in TelemetryEvent.objects.all():
        event.event_id = event.id
        event.save(update_fields=['event_id'])

class Migration(migrations.Migration):

    dependencies = [
        ('endpoints', '0001_initial'),
        ('projects', '0001_initial'),
        ('telemetry', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='telemetryevent',
            name='event_id',
            field=models.CharField(
                db_index=True,
                null=True,
                blank=True,
                max_length=128,
                help_text='Unique event ID or idempotency key from client SDK',
            ),
        ),
        migrations.RunPython(backfill_event_ids, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='telemetryevent',
            name='event_id',
            field=models.CharField(
                db_index=True,
                default=apps.telemetry.models.default_telemetry_id,
                max_length=128,
                help_text='Unique event ID or idempotency key from client SDK',
            ),
        ),
        migrations.AddConstraint(
            model_name='telemetryevent',
            constraint=models.UniqueConstraint(fields=('project', 'event_id'), name='unique_project_event_id'),
        ),
    ]
