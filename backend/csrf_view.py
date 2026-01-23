from django.middleware.csrf import get_token
from django.http import JsonResponse

def get_csrf_token(request):
    """
    Return the CSRF token to the frontend.
    This ensures the cookie is set and provides the token value.
    """
    token = get_token(request)
    return JsonResponse({'csrfToken': token})
