# --- CSS-LAB-BOA Sandbox Image ---
# Uses ubuntu:22.04 instead of gcc:13-bookworm for faster, more reliable builds
# (gcc:13-bookworm is ~1.5 GB and has slow ARM64 mirrors; ubuntu:22.04 is ~77 MB)
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    gdb \
    make \
    binutils \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash student
WORKDIR /home/student

# Level sources are baked into the image so no host filesystem is exposed
# into the sandbox at runtime.
COPY levels/ /opt/levels/
RUN chown -R student:student /opt/levels /home/student

# Generate CTF Flags for each level
RUN echo "CSS{b0unds_ch3ck_f4il_10611}" > /opt/levels/01-gets/flag.txt && \
    echo "CSS{strcp7_n0_l1m1t_b33th}" > /opt/levels/02-strcpy/flag.txt && \
    echo "CSS{strc4t_4pp3nd_0v3rfl0w}" > /opt/levels/03-strcat/flag.txt && \
    echo "CSS{spr1ntf_f0rm4t_sm4sh}" > /opt/levels/04-sprintf/flag.txt && \
    echo "CSS{m3mcpy_l3ngth_p4n1c}" > /opt/levels/05-memcpy/flag.txt && \
    echo "CSS{4rr4y_1nd3x_0ut_0f_b0unds}" > /opt/levels/06-array-indexing/flag.txt && \
    echo "CSS{r1p_c0ntr0l_h1j4ck3d}" > /opt/levels/07-bonus-redirect/flag.txt

# Secure the flags so they can only be read, not modified
RUN chown -R root:student /opt/levels/*/flag.txt && chmod 440 /opt/levels/*/flag.txt

USER student
CMD ["/bin/bash"]
