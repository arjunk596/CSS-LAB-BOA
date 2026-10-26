FROM gcc:13-bookworm

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    gdb \
    gdb-multiarch \
    gcc-multilib \
    libc6-dev-i386 \
    binutils-multiarch \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash student
WORKDIR /home/student

# Level sources are baked into the image so no host filesystem is exposed
# into the sandbox at runtime.
COPY levels/ /opt/levels/
RUN chown -R student:student /opt/levels /home/student

USER student
CMD ["/bin/bash"]