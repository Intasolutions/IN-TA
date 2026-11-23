from django.apps import AppConfig


class HomeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'home'

    def ready(self):
        from . import retention, revalidate

        revalidate.connect()
        # visitors' messages, enquiries, chats and cookie choices are deleted after DATA_RETENTION_DAYS
        retention.connect()
