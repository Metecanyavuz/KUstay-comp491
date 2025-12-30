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
from django.urls import include, path, re_path
from django.views.static import serve as media_serve
from rest_framework.routers import DefaultRouter

from kustay import views
from kustay.api_views import ConversationViewSet, ListingViewSet

from kustay import api_views

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="api-listings")
router.register("conversations", ConversationViewSet, basename="api-conversations")

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
    path("api/faculties/", views.FacultyListView.as_view(), name="faculties"),
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

    ##new urls for frontend.
    path("api/", include(router.urls)),
    path('api/csrf/', api_views.get_csrf_token, name='csrf'),  # CSRF endpoint
    path('api/profile/', api_views.profile_view_api, name='api_profile'),  # Profile API
    path('api/profile/<int:user_id>/', api_views.user_profile_view, name='api_user_profile'),  # View other user's profile
    path('api/block-reviews/', api_views.block_reviews_view, name='api_block_reviews'),
    path('api/block-reviews/highlights/', api_views.block_review_highlights, name='api_block_review_highlights'),
    path('api/block-reviews/buildings/', api_views.block_review_buildings, name='api_block_review_buildings'),
    path('api/home/stats/', api_views.home_page_stats, name='api_home_stats'),
    path('api/addresses/provinces/', api_views.address_provinces, name='api_address_provinces'),
    path('api/addresses/districts/', api_views.address_districts, name='api_address_districts'),
    path('api/addresses/neighborhoods/', api_views.address_neighborhoods, name='api_address_neighborhoods'),
    path('api/addresses/streets/', api_views.address_streets, name='api_address_streets'),


    path('api/auth/signup/', api_views.signup_view),
    path('api/auth/login/', api_views.login_view),
    path('api/auth/logout/', api_views.logout_view),
    path('api/auth/me/', api_views.me_view),
    path('api/auth/verify-email/', api_views.verify_email_view),
    path('api/auth/forgot-password/', api_views.forgot_password_view),
    path('api/auth/reset-password/', api_views.reset_password_view),
]

if settings.SERVE_MEDIA:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", media_serve, {"document_root": settings.MEDIA_ROOT}),
    ]
elif settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
