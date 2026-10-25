#include <stdio.h>
#include <string.h>

void secure_concat(char *suffix) {
    char buffer[20] = "Hello, ";
    size_t remaining = sizeof(buffer) - strlen(buffer) - 1;
    strncat(buffer, suffix, remaining);
    printf("%s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    secure_concat(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
