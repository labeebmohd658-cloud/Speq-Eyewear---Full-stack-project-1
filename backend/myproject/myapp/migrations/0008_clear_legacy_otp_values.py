from django.db import migrations


def clear_legacy_otp_values(apps, schema_editor):
    # Get the historical EmailOTP model.
    EmailOTP = apps.get_model("myapp", "EmailOTP")

    # Delete old OTP records containing plaintext OTP values.
    EmailOTP.objects.using(schema_editor.connection.alias).all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("myapp", "0007_rename_otp_emailotp_otp_hash"),
    ]

    operations = [
        migrations.RunPython(
            clear_legacy_otp_values,
            migrations.RunPython.noop,
        ),
    ]