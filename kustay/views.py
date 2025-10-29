from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render

from .forms import ProfileForm
from .models import Profile


def login_view(request):
    if request.user.is_authenticated:
        return redirect("profile")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("profile")
        messages.error(request, "Invalid email or password.")
    else:
        form = AuthenticationForm(request)

    return render(request, "login.html", {"form": form})


@login_required
def profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        form = ProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, "Preferences saved.")
            return redirect("profile")
        messages.error(request, "Please correct the errors below.")
    else:
        form = ProfileForm(instance=profile)

    return render(
        request,
        "profile.html",
        {
            "user": request.user,
            "form": form,
        },
    )


@login_required
def logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect("login")
