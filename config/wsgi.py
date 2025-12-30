"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import logging

from django.core.wsgi import get_wsgi_application
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()

logger = logging.getLogger(__name__)
try:
    os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
    os.makedirs(os.path.join(settings.MEDIA_ROOT, "listing_images"), exist_ok=True)
    logger.info(
        "MEDIA_ROOT=%s MEDIA_URL=%s SERVE_MEDIA=%s",
        settings.MEDIA_ROOT,
        settings.MEDIA_URL,
        settings.SERVE_MEDIA,
    )
except Exception:
    logger.exception("Failed to initialize media directories")
