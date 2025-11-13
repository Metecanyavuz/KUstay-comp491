"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from kustay import views
from kustay.api_views import ListingViewSet

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="api-listings")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.home_view, name="home"),
    path("listings/", views.listing_list_view, name="listings"),
    path("listings/new/", views.listing_create_view, name="listing_create"),
    path(
        "listings/<int:listing_id>/",
        views.listing_detail_view,
        name="listing_detail",
    ),
    path(
        "listings/<int:listing_id>/edit/",
        views.listing_update_view,
        name="listing_edit",
    ),
    path(
        "listings/<int:listing_id>/delete/",
        views.listing_delete_view,
        name="listing_delete",
    ),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
    path("matches/", views.matches_view, name="matches"),
    path("api/matches/top/", views.TopMatchesAPIView.as_view(), name="top-matches-api"),
    path("conversations/", views.conversation_list_view, name="conversations"),
    path(
        "conversations/start/<int:user_id>/",
        views.conversation_start_view,
        name="conversation_start",
    ),
    path(
        "conversations/<int:conversation_id>/",
        views.conversation_detail_view,
        name="conversation_detail",
    ),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
