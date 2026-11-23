from django.db import models


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True, help_text='Mobile number without country code')
    country = models.CharField(max_length=64, blank=True, help_text='Country name or code (e.g. India, IN)')
    message = models.TextField()
    is_request = models.BooleanField(default=False, help_text='Whether user marked this as a submit request')
    source = models.CharField(max_length=200, blank=True, help_text='Optional: where the message came from')
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact message'
        verbose_name_plural = 'Contact messages'

    def __str__(self):
        return f"{self.name} <{self.email}> — {self.message[:40]}"


class ChatConversation(models.Model):
    """A conversation with the website robot (components/guide/GuideChat.tsx), kept so the team can follow up.

    It starts with the small form in the chat (name, and a phone number or an email): those go straight to here and
    are never sent to the AI. The messages are the whole conversation, as the visitor saw it. What they need, the
    service, business, timeline and budget are what the robot understood; the pages are the ones they looked at.
    Only the browser that started a conversation can add to it (it holds the conversation's token).
    """
    token = models.CharField(max_length=40, editable=False)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    service = models.CharField(max_length=200, blank=True, help_text="The service they're interested in, as the robot understood it.")
    need = models.TextField(blank=True, help_text="What they need, in the robot's words.")
    business = models.CharField(max_length=200, blank=True, help_text='Their kind of business, if they said.')
    timeline = models.CharField(max_length=120, blank=True, help_text='When they need it, if they said.')
    budget = models.CharField(max_length=120, blank=True, help_text='Their budget, if they said.')
    pages = models.TextField(blank=True, help_text='The pages they looked at on the website.')
    source = models.CharField(max_length=200, blank=True, help_text='The page the chat started on.')
    messages = models.JSONField(default=list, blank=True, help_text='The conversation: who said what, and when.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Robot chat'
        verbose_name_plural = 'Robot chats'

    def __str__(self):
        return f"{self.name} ({self.phone or self.email})"


class ConsentRecord(models.Model):
    """An answer to the website's cookie prompt (components/ConsentBanner.tsx), which asks before the Meta Pixel starts.

    Kept as proof of what was asked and answered: the law puts it on us to show that someone agreed. It holds nothing
    about who they are: a random code their browser made, the answer, the version of the prompt's wording, the page and
    the time. A changed answer (from Cookie settings) adds a new record with the same code.
    """
    browser = models.CharField(max_length=40, help_text="A random code kept in the visitor's browser with their answer.")
    allowed = models.BooleanField(help_text='Whether they allowed the Meta Pixel.')
    version = models.CharField(max_length=40, help_text="The version of the prompt's wording they answered.")
    page = models.CharField(max_length=200, blank=True, help_text='The page they answered on.')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Cookie choice'
        verbose_name_plural = 'Cookie choices'

    def __str__(self):
        return f"{'Allowed' if self.allowed else 'Declined'} · {self.browser[:8]}…"
